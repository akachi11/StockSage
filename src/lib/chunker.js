function chunkText(text, { maxChars = 800, overlap = 100 } = {}) {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return [trimmed];

  const sentences = trimmed.match(/[^.!?]+[.!?]+(\s+|$)/g) || [trimmed];
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length > 0 && (current + sentence).length > maxChars) {
      chunks.push(current.trim());
      current = current.slice(-overlap) + sentence;
    } else {
      current += sentence;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

module.exports = { chunkText };
