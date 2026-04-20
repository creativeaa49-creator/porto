// URL Web App Google Script Anda yang terbaru
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyeNSXiscyCrkS6cC7jUjROicOt85u9C40hmC4D8G5EHK_kcdiM5bhYgEzKI48AE0mw/exec';

export const sheetsService = {
  async getAll() {
    try {
      const url = `${SCRIPT_URL}?t=${Date.now()}`;
      console.log(`[Database] Sinkronisasi kilat seluruh data...`);
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching all data:", error);
      return null;
    }
  },

  async get(sheetName: string) {
    if (!SCRIPT_URL.startsWith('http')) {
      console.error('URL Google Sheets tidak valid.');
      return [];
    }

    try {
      const url = `${SCRIPT_URL}?sheet=${sheetName}&t=${Date.now()}`;
      console.log(`[Database] Mengambil data dari: ${sheetName}...`);
      
      const response = await fetch(url);
      const text = await response.text();
      
      try {
        const json = JSON.parse(text);
        return json;
      } catch (jsonError) {
        if (text.includes('<!doctype') || text.includes('<html')) {
          console.error(`[CRITICAL] Google API mengembalikan HTML, bukan JSON.`);
          console.group("Detail Masalah:");
          console.error("- URL Script: ", SCRIPT_URL);
          console.error("- Sheet: ", sheetName);
          console.error("- Respons Masuk: ", text.substring(0, 500) + "...");
          console.groupEnd();
          
          alert(`PENTING: Google Sheets API membalas dengan halaman web (HTML). \n\nHal ini biasanya karena Anda belum klik "Deploy" -> "Anyone" di Google Script, atau Anda salah salin URL.`);
        }
        throw new Error("Respons bukan JSON");
      }
    } catch (error) {
      console.error(`Error fetching from sheet ${sheetName}:`, error);
      return [];
    }
  },

  async create(sheetName: string, data: any) {
    try {
      console.log(`[Database] Menambah data ke ${sheetName}...`);
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ ...data, sheet: sheetName, action: 'create' })
      });
      return { status: 'success' };
    } catch (error) {
      console.error(`Error creating in sheet ${sheetName}:`, error);
      throw error;
    }
  },

  async update(sheetName: string, id: string, data: any) {
    try {
      console.log(`[Database] Memperbarui data di ${sheetName}...`);
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ ...data, id, sheet: sheetName, action: 'update' })
      });
      return { status: 'success' };
    } catch (error) {
      console.error(`Error updating in sheet ${sheetName}:`, error);
      throw error;
    }
  },

  async delete(sheetName: string, id: string) {
    try {
      console.log(`[Database] Menghapus data dari ${sheetName}...`);
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ id, sheet: sheetName, action: 'delete' })
      });
      return { status: 'success' };
    } catch (error) {
      console.error(`Error deleting from sheet ${sheetName}:`, error);
      throw error;
    }
  }
};
