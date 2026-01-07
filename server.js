require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// DİKKAT: Eski 'public' klasörü satırını sildik.
// Yerine, ana sayfaya girilince direkt index.html'i gönder diyoruz.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- 1. CHAT API ---
app.post('/api/chat', async (req, res) => {
    let { messages, model, temperature, apiKey, username, password } = req.body;

    // A. KULLANICI KONTROLÜ
    if (password) {
        try {
            const usersData = fs.readFileSync('users.json', 'utf8');
            const users = JSON.parse(usersData);
            const foundUser = users.find(u => u.username === username && u.password === password);

            if (foundUser) {
                console.log(`👑 Yetkili Giriş: ${username}`);
                apiKey = process.env.GROQ_API_KEY;
            }
        } catch (error) {
            console.error("User DB Hatası:", error);
        }
    }

    // B. ANAHTAR KONTROLÜ
    if (!apiKey) {
        return res.status(401).json({ error: "Giriş Başarısız! Şifre yanlış veya API Key yok." });
    }

    // C. GROQ İSTEĞİ
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
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 2. HAVA DURUMU API ---
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
app.listen(PORT, () => {
    console.log(`🚀 Migos Sunucusu Çalışıyor: http://localhost:${PORT}`);
});