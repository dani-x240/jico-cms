/**
 * Logo Upload & Theming Utilities
 * Handles base64 encoding, validation, and logo management
 */

const MAX_LOGO_SIZE = 500 * 1024; // 500KB
const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Validate logo file before upload
 * @param {File} file - The logo file to validate
 * @returns {{valid: boolean, error?: string}}
 */
export const validateLogoFile = (file) => {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (file.size > MAX_LOGO_SIZE) {
    return { valid: false, error: `File size must be less than ${MAX_LOGO_SIZE / 1024}KB` };
  }

  if (!ALLOWED_FORMATS.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, GIF, and WebP images are allowed' };
  }

  return { valid: true };
};

/**
 * Convert image file to base64 string
 * @param {File} file - The image file to convert
 * @returns {Promise<string>} Base64 encoded string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Upload logo to school in database
 * @param {number} schoolId - School ID
 * @param {string} base64String - Base64 encoded image
 * @param {object} supabase - Supabase client
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const uploadSchoolLogo = async (schoolId, base64String, supabase) => {
  try {
    if (!schoolId || !base64String) {
      return { success: false, message: 'Missing school ID or image data' };
    }

    const { error } = await supabase
      .from('schools')
      .update({ logo_url: base64String })
      .eq('id', schoolId);

    if (error) {
      console.error('Logo upload error:', error);
      return { success: false, message: 'Failed to upload logo: ' + error.message };
    }

    return { success: true, message: 'Logo uploaded successfully' };
  } catch (error) {
    console.error('uploadSchoolLogo error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get school logo URL or return default
 * @param {string|null} logoUrl - Logo URL from database
 * @returns {string} Logo URL (base64 or default)
 */
export const getSchoolLogoUrl = (logoUrl) => {
  if (logoUrl && logoUrl.startsWith('data:')) {
    return logoUrl;
  }
  
  // Return default Jinja logo
  return require('../assets/logo.jpg');
};

/**
 * Handle logo file input change
 * @param {Event} e - File input change event
 * @returns {Promise<{valid: boolean, error?: string, base64?: string, file?: File}>}
 */
export const handleLogoFileSelect = async (e) => {
  const file = e.target.files?.[0];

  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  // Validate file
  const validation = validateLogoFile(file);
  if (!validation.valid) {
    return { valid: false, error: validation.error };
  }

  try {
    // Convert to base64
    const base64 = await fileToBase64(file);
    
    return {
      valid: true,
      file,
      base64,
      preview: base64 // Same as base64 for display
    };
  } catch (error) {
    return { valid: false, error: 'Failed to process image: ' + error.message };
  }
};

/**
 * Get theme color based on school branding
 * Can be extended for full theme support
 * @param {string|null} schoolLogoUrl - School logo URL
 * @returns {{primaryColor: string, secondaryColor: string}}
 */
export const getSchoolTheme = (schoolLogoUrl) => {
  // Default theme
  const defaultTheme = {
    primaryColor: '#667eea',
    secondaryColor: '#764ba2'
  };

  if (!schoolLogoUrl) {
    return defaultTheme;
  }

  // Could extract dominant color from image here
  // For now, return default
  return defaultTheme;
};

/**
 * Format logo for display in sidebar/header
 * @param {string|null} logoUrl - Logo URL from database
 * @param {string} schoolName - School name for alt text
 * @returns {{url: string, alt: string}}
 */
export const formatLogoForDisplay = (logoUrl, schoolName = 'School Logo') => {
  return {
    url: getSchoolLogoUrl(logoUrl),
    alt: schoolName
  };
};

/**
 * Remove school logo (set to null in database)
 * @param {number} schoolId - School ID
 * @param {object} supabase - Supabase client
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const removeSchoolLogo = async (schoolId, supabase) => {
  try {
    const { error } = await supabase
      .from('schools')
      .update({ logo_url: null })
      .eq('id', schoolId);

    if (error) {
      return { success: false, message: 'Failed to remove logo: ' + error.message };
    }

    return { success: true, message: 'Logo removed successfully' };
  } catch (error) {
    console.error('removeSchoolLogo error:', error);
    return { success: false, message: error.message };
  }
};
