// ====================================================================
// CMS HELPER UTILITIES
// Common functions used across CMS components
// ====================================================================

/**
 * Generate a unique ID
 */
export const generateId = () => {
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Format date for display
 */
export const formatDate = (dateString) => {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
};

/**
 * Capitalize first letter of string
 */
export const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Convert slug to readable title
 */
export const slugToTitle = (slug) => {
  if (!slug) return "";
  return slug
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .split(" ")
    .map(word => capitalize(word))
    .join(" ");
};

/**
 * Convert title to slug
 */
export const titleToSlug = (title) => {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

/**
 * Get section type display name
 */
export const getSectionTypeName = (type) => {
  const typeNames = {
    hero: "Hero Section",
    features: "Features Section",
    steps: "Steps Section",
    cta: "Call to Action",
    "content-block": "Content Block",
    team: "Team Section",
    "info-cards": "Info Cards",
    locations: "Locations",
    "tab-content": "Tab Content",
    "legal-text": "Legal Text",
    "auth-form": "Auth Form"
  };
  return typeNames[type] || capitalize(type);
};

/**
 * Get icon for section type
 */
export const getSectionTypeIcon = (type) => {
  const icons = {
    hero: "Sparkles",
    features: "Grid",
    steps: "ListOrdered",
    cta: "Megaphone",
    "content-block": "FileText",
    team: "Users",
    "info-cards": "CreditCard",
    locations: "MapPin",
    "tab-content": "Layers",
    "legal-text": "Scale",
    "auth-form": "LogIn"
  };
  return icons[type] || "Layout";
};

/**
 * Sort sections by order
 */
export const sortByOrder = (items) => {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => (a.order || 0) - (b.order || 0));
};

/**
 * Validate URL format
 */
export const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch {
    return string.startsWith("/");
  }
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Deep clone object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj) => {
  if (!obj) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === "object") return Object.keys(obj).length === 0;
  return false;
};

/**
 * Get file extension from URL or filename
 */
export const getFileExtension = (filename) => {
  if (!filename) return "";
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
};

/**
 * Check if file is an image
 */
export const isImage = (filename) => {
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];
  return imageExtensions.includes(getFileExtension(filename));
};

/**
 * Format bytes to human readable size
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export default {
  generateId,
  formatDate,
  truncateText,
  capitalize,
  slugToTitle,
  titleToSlug,
  getSectionTypeName,
  getSectionTypeIcon,
  sortByOrder,
  isValidUrl,
  isValidEmail,
  deepClone,
  isEmpty,
  getFileExtension,
  isImage,
  formatBytes,
  debounce
};
