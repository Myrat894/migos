require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // 'public' klasöründeki html'i sunar

// --- 1. CHAT API (Zeka) ---
app.post('/api/chat', async (req, res) => {
    let { messages, model, temperature, apiKey, username, password } = req.body;

    // A. KULLANICI KONTROLÜ (users.json)
    // Eğer şifre geldiyse, listede var mı diye bak
    if (password) {
        try {
            const usersData = fs.readFileSync('users.json', 'utf8');
            const users = JSON.parse(usersData);
            
            // Kullanıcıyı ve şifreyi doğrula
            const foundUser = users.find(u => u.username === username && u.password === password);

            if (foundUser) {
                console.log(`👑 Yetkili Giriş: ${username} (Server Key Kullanılıyor)`);
                apiKey = process.env.GROQ_API_KEY; // KASADAKİ GİZLİ KEYİ VER
            } else {
                console.log(`❌ Hatalı Şifre Denemesi: ${username}`);
            }
        } catch (error) {
            console.error("Veritabanı okuma hatası:", error);
        }
    }

    // B. ANAHTAR KONTROLÜ
    // Ne listede bulundu ne de kendi keyini gönderdi...
    if (!apiKey) {
        return res.status(401).json({ error: "Giriş Başarısız! Şifre yanlış veya API Key yok." });
    }

    // C. GROQ'A İSTEK ATMA
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
        
        if (data.error) {
            throw new Error(data.error.message);
        }
        
        res.json(data);
    } catch (error) {
        console.error("Groq Hatası:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- 2. HAVA DURUMU API ---
app.get('/api/weather', async (req, res) => {
    const key = process.env.WEATHER_API_KEY;
    if(!key) return res.status(500).json({error:"Serverda hava durumu anahtarı yok"});
    
    try {
        const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Istanbul&units=metric&lang=tr&appid=${key}`);
        const d = await r.json();
        res.json(d);
    } catch(e) { 
        res.status(500).json({error:"Hava durumu alınamadı"}); 
    }
});

// --- SUNUCUYU BAŞLAT ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Migos Sunucusu Çalışıyor: http://localhost:${PORT}`);
});