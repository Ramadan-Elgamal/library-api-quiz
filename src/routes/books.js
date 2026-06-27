const express = require('express');
const db = require('../../db/database');

const router = express.Router();

const getBookWithAuthor = (book) => {
  if (!book) return null;
  const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(book.author_id);
  return { ...book, author };
};

// GET /books
// Return all books. Optional query param: ?author_id=<id>
router.get('/', (req, res) => {
  const authorId = req.query.author_id;
  let books;
  if (authorId) {
    books = db.prepare('SELECT * FROM books WHERE author_id = ?').all(authorId);
  } else {
    books = db.prepare('SELECT * FROM books').all();
  }
  res.json(books.map(getBookWithAuthor));
});

// GET /books/:id
// Return a single book including its author info. 404 if not found.
router.get('/:id', (req, res) => {
  const bookId = req.params.id;
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  res.json(getBookWithAuthor(book));
});

// POST /books
// Create a new book. Body: { title, year?, author_id }
// Respond 201 with the created book. 404 if author_id does not exist.
router.post('/', (req, res) => {
  const { title, year, author_id } = req.body;
  const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(author_id);
  if (!author) {
    return res.status(404).json({ error: 'Author not found' });
  }
  const result = db.prepare('INSERT INTO books (title, year, author_id) VALUES (?, ?, ?)').run(title, year || null, author_id);
  const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(getBookWithAuthor(newBook));
});

// PATCH /books/:id
// Update title, year, or author_id. Body: { title?, year?, author_id? }
// Respond 200 with the updated book. 404 if not found.
router.patch('/:id', (req, res) => {
  const bookId = req.params.id;
  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
  if (!existing) {
    return res.status(404).json({ error: 'Book not found' });
  }
  const title = req.body.title !== undefined ? req.body.title : existing.title;
  const year = req.body.year !== undefined ? req.body.year : existing.year;
  const author_id = req.body.author_id !== undefined ? req.body.author_id : existing.author_id;

  if (req.body.author_id !== undefined) {
    const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(author_id);
    if (!author) {
      return res.status(404).json({ error: 'Author not found' });
    }
  }

  db.prepare('UPDATE books SET title = ?, year = ?, author_id = ? WHERE id = ?').run(title, year, author_id, bookId);
  const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
  res.status(200).json(getBookWithAuthor(updated));
});

// DELETE /books/:id
// Delete a book. 204 on success. 404 if not found.
router.delete('/:id', (req, res) => {
  const bookId = req.params.id;
  const result = db.prepare('DELETE FROM books WHERE id = ?').run(bookId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Book not found' });
  }
  res.status(204).end();
});

module.exports = router;
