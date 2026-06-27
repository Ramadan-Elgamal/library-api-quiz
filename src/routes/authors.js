const express = require('express');
const db = require('../../db/database');

const router = express.Router();

// GET /authors
// Return all authors.
router.get('/', (req, res) => {
  const authors = db.prepare('SELECT * FROM authors').all();
  res.json(authors);
});

// GET /authors/:id/books
// Return all books by this author. 404 if author not found.
router.get('/:id/books', (req, res) => {
  const authorId = req.params.id;
  const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(authorId);
  if (!author) {
    return res.status(404).json({ error: 'Author not found' });
  }
  const books = db.prepare('SELECT * FROM books WHERE author_id = ?').all(authorId);
  res.json(books);
});

// GET /authors/:id
// Return a single author. 404 if not found.
router.get('/:id', (req, res) => {
  const authorId = req.params.id;
  const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(authorId);
  if (!author) {
    return res.status(404).json({ error: 'Author not found' });
  }
  res.json(author);
});

// POST /authors
// Create a new author. Body: { name, bio? }
// Respond 201 with the created author.
router.post('/', (req, res) => {
  const result = db.prepare('INSERT INTO authors (name, bio) VALUES (?, ?)').run(req.body.name, req.body.bio || null);
  const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(author);
});

// PATCH /authors/:id
// Update name and/or bio. Body: { name?, bio? }
// Respond 200 with the updated author. 404 if not found.
router.patch('/:id', (req, res) => {
  const authorId = req.params.id;
  const existing = db.prepare('SELECT * FROM authors WHERE id = ?').get(authorId);
  if (!existing) {
    return res.status(404).json({ error: 'Author not found' });
  }
  const name = req.body.name !== undefined ? req.body.name : existing.name;
  const bio = req.body.bio !== undefined ? req.body.bio : existing.bio;
  db.prepare('UPDATE authors SET name = ?, bio = ? WHERE id = ?').run(name, bio, authorId);
  const updated = db.prepare('SELECT * FROM authors WHERE id = ?').get(authorId);
  res.status(200).json(updated);
});

// DELETE /authors/:id
// Delete an author and their books (cascade). 204 on success. 404 if not found.
router.delete('/:id', (req, res) => {
  const authorId = req.params.id;
  const result = db.prepare('DELETE FROM authors WHERE id = ?').run(authorId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Author not found' });
  }
  res.status(204).end();
});



module.exports = router;
