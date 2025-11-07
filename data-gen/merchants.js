// Realistic merchant names by category
// SECURITY REVIEW: Manual security review performed (Semgrep MCP unavailable)
// - Static data arrays only, no executable code
// - No security concerns for data-only file

const GROCERY_STORES = [
  'Kroger', 'Whole Foods', 'Trader Joe\'s', 'Safeway', 'Walmart', 
  'Target', 'Costco', 'Aldi', 'Publix', 'Wegmans'
];

const DINING_RESTAURANTS = [
  'Chipotle', 'Starbucks', 'McDonald\'s', 'Subway', 'Taco Bell',
  'Local Restaurant', 'The Corner Bistro', 'Downtown Cafe', 
  'Pizza Palace', 'Burger House', 'Sushi Express', 'Thai Garden'
];

const SUBSCRIPTIONS = [
  'Netflix', 'Spotify', 'Amazon Prime', 'NYT', 'Gym Membership',
  'Adobe Creative', 'Microsoft 365', 'Disney+', 'Hulu', 'Apple Music',
  'YouTube Premium', 'HBO Max', 'Peloton', 'ClassPass', 'Audible'
];

const UTILITIES = [
  'Electric Company', 'Gas & Water Utility', 'Internet Provider',
  'Phone Company', 'Cable Company', 'Trash Service'
];

const SHOPPING = [
  'Amazon', 'Target', 'Costco', 'Walmart', 'Best Buy',
  'Home Depot', 'Macy\'s', 'Nike', 'Apple Store', 'Etsy'
];

const TRAVEL = [
  'United Airlines', 'Delta Airlines', 'American Airlines',
  'Marriott Hotels', 'Hilton Hotels', 'Airbnb', 'Uber', 'Lyft'
];

const ENTERTAINMENT = [
  'AMC Theaters', 'Regal Cinemas', 'Ticketmaster', 'Eventbrite',
  'Concert Venue', 'Sports Arena', 'Museum', 'Zoo'
];

module.exports = {
  GROCERY_STORES,
  DINING_RESTAURANTS,
  SUBSCRIPTIONS,
  UTILITIES,
  SHOPPING,
  TRAVEL,
  ENTERTAINMENT
};

