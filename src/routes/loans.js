const express = require('express');
const db = require('../../db/database');

const router = express.Router();

const getLoanWithBook = (loan) => {
  if (!loan) return null;
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(loan.book_id);
  return { ...loan, book };
};

// GET /loans
// Return all loans. Optional query param: ?returned=true|false
// (filter by whether returned_at is set)
router.get('/', (req, res) => {
  const returned = req.query.returned;
  let loans;
  if (returned === 'true') {
    loans = db.prepare('SELECT * FROM loans WHERE returned_at IS NOT NULL').all();
  } else if (returned === 'false') {
    loans = db.prepare('SELECT * FROM loans WHERE returned_at IS NULL').all();
  } else {
    loans = db.prepare('SELECT * FROM loans').all();
  }
  res.json(loans.map(getLoanWithBook));
});

// GET /loans/:id
// Return a single loan including book info. 404 if not found.
router.get('/:id', (req, res) => {
  const loanId = req.params.id;
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
  if (!loan) {
    return res.status(404).json({ error: 'Loan not found' });
  }
  res.json(getLoanWithBook(loan));
});

// POST /loans
// Check out a book. Body: { book_id, borrower_name }
// 404 if book not found.
// 409 if the book is already on active loan (returned_at IS NULL).
// Respond 201 with the created loan.
router.post('/', (req, res) => {
  const { book_id, borrower_name } = req.body;
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  const activeLoan = db.prepare('SELECT * FROM loans WHERE book_id = ? AND returned_at IS NULL').get(book_id);
  if (activeLoan) {
    return res.status(409).json({ error: 'Book already on active loan' });
  }
  const today = new Date().toISOString().split('T')[0];
  const result = db.prepare('INSERT INTO loans (book_id, borrower_name, loaned_at) VALUES (?, ?, ?)').run(book_id, borrower_name, today);
  const newLoan = db.prepare('SELECT * FROM loans WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(getLoanWithBook(newLoan));
});

// PATCH /loans/:id/return
// Mark a loan as returned (set returned_at = today).
// 404 if loan not found. 409 if already returned.
// Respond 200 with the updated loan.
router.patch('/:id/return', (req, res) => {
  const loanId = req.params.id;
  const existing = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
  if (!existing) {
    return res.status(404).json({ error: 'Loan not found' });
  }
  if (existing.returned_at !== null) {
    return res.status(409).json({ error: 'Loan already returned' });
  }
  const today = new Date().toISOString().split('T')[0];
  db.prepare('UPDATE loans SET returned_at = ? WHERE id = ?').run(today, loanId);
  const updated = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
  res.status(200).json(getLoanWithBook(updated));
});

module.exports = router;
