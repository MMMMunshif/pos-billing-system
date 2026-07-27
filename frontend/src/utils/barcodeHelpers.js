export function generateMckBarcode() {
    const now = new Date();
  
    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timePart = String(Date.now()).slice(-6);
  
    return `MCK${year}${month}${day}${timePart}`;
  }
  
  export function normalizeBarcode(value) {
    return String(value || '').trim().toUpperCase();
  }