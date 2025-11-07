// Username Utility
// Converts full names to usernames: "John Doe" -> "john.doe"

/**
 * Convert full name to username format
 * Format: firstname.lastname (lowercase, spaces replaced with periods)
 * 
 * @param name - Full name (e.g., "John Doe", "Mary Jane Smith")
 * @returns Username (e.g., "john.doe", "mary.jane.smith")
 * 
 * Examples:
 * - "John Doe" -> "john.doe"
 * - "Mary Jane Smith" -> "mary.jane.smith"
 * - "Bob" -> "bob"
 * - "  John   Doe  " -> "john.doe" (trims whitespace)
 */
export function generateUsername(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // Trim whitespace and normalize spaces
  const normalized = name.trim().replace(/\s+/g, ' ');
  
  // Convert to lowercase and replace spaces with periods
  const username = normalized.toLowerCase().replace(/\s/g, '.');
  
  return username;
}

/**
 * Find user by username
 * Looks up user in database by converting their name to username format
 * 
 * @param username - Username to search for (e.g., "john.doe")
 * @returns User object with user_id and name, or null if not found
 */
export async function findUserByUsername(username: string): Promise<{ user_id: string; name: string; email: string } | null> {
  if (!username || typeof username !== 'string') {
    return null;
  }

  const { all } = await import('../db/db');
  
  // Find user by matching username format
  // We need to convert stored names to username format for comparison
  // SQLite doesn't have great string manipulation, so we'll fetch all users and filter
  // For better performance, we could add a username column to the users table
  
  const users = await all<{ user_id: string; name: string; email: string }>(
    `SELECT user_id, name, email FROM users`
  );

  if (!users || !Array.isArray(users)) {
    return null;
  }

  // Find user whose name converts to the requested username
  const user = users.find(u => generateUsername(u.name) === username.toLowerCase());
  
  return user || null;
}

