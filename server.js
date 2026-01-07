require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// --- DÜZELTME BURADA ---
// Artık 'public' klasörü aramıyoruz. Direkt ana dizindeki index.html'i veriyoruz.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- YARDIMCI: Sohbetleri Dosyadan Oku/Yaz ---
const CHAT_FILE = 'chats.json';

function getChats() {
    try {
        if (!fs.existsSync(CHAT_FILE)) fs.writeFileSync(CHAT_FILE, '{}');
        return JSON.parse(fs.readFileSync(CHAT_FILE, 'utf8'));
    } catch (e) { return {}; }
}

function saveChat(username, messageObj) {
    const allChats = getChats();
    if (!allChats[username]) allChats[username] = [];
    allChats[username].push(messageObj);
    fs.writeFileSync(CHAT_FILE, JSON.stringify(allChats, null, 2));
}

// --- 1. GEÇMİŞİ GETİR ---
app.get('/api/history', (req, res) => {
    const { username } = req.query;
    if (!username) return res.json([]);
    const allChats = getChats();
    res.json(allChats[username] || []);
});

// --- 2. CHAT API ---
app.post('/api/chat', async (req, res) => {
    let { messages, model, temperature, apiKey, username, password } = req.body;

    if (password) {
        try {
            const usersData = fs.readFileSync('users.json', 'utf8');
            const users = JSON.parse(usersData);
            const foundUser = users.find(u => u.username === username && u.password === password);
            if (foundUser) apiKey = process.env.GROQ_API_KEY;
        } catch (error) { console.error("User DB Hatası:", error); }
    }

    if (!apiKey) return res.status(401).json({ error: "Giriş Başarısız!" });

    // Kullanıcı mesajını kaydet
    const userMessage = messages[messages.length - 1];
    saveChat(username, userMessage);

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages, model, temperature })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        // AI cevabını kaydet
        const aiMessage = data.choices[0].message;
        saveChat(username, aiMessage);

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 3. HAVA DURUMU ---
app.get('/api/weather', async (req, res) => {
    const key = process.env.WEATHER_API_KEY;
    if(!key) return res.status(500).json({error:"Key yok"});
    try {
        const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Istanbul&units=metric&lang=tr&appid=${key}`);
        const d = await r.json();
        res.json(d);
    } catch(e) { res.status(500).json({error:"Hata"}); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Sunucu Hazır: http://localhost:${PORT}`));
