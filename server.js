const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ذخیره موقت کدهای تایید
const verificationCodes = new Map();

// پیکربندی ایمیل (برای Gmail)
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// تولید کد تایید ۶ رقمی
function generateVerificationCode() {
    return crypto.randomInt(100000, 999999).toString();
}

// Route اصلی
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route ثبت نام و ارسال کد تایید
app.post('/api/register', async (req, res) => {
    const { username, email } = req.body;
    
    // اعتبارسنجی
    if (!username || !email) {
        return res.status(400).json({ 
            success: false,
            message: 'نام کاربری و ایمیل الزامی است' 
        });
    }

    if (!email.includes('@')) {
        return res.status(400).json({
            success: false,
            message: 'فرمت ایمیل نامعتبر است'
        });
    }
    
    try {
        // تولید کد تایید
        const verificationCode = generateVerificationCode();
        
        // ذخیره کد
        verificationCodes.set(email, {
            code: verificationCode,
            username: username,
            expires: Date.now() + 10 * 60 * 1000 // 10 دقیقه اعتبار
        });
        
        // ارسال ایمیل
        await transporter.sendMail({
            from: process.env.EMAIL_USER || 'your-email@gmail.com',
            to: email,
            subject: 'کد تایید ثبت نام',
            html: `
                <div dir="rtl" style="font-family: Tahoma, sans-serif; text-align: center; padding: 20px;">
                    <h2 style="color: #333;">کد تایید ثبت نام</h2>
                    <p>کاربر گرامی <strong>${username}</strong>,</p>
                    <p>کد تایید شما برای ثبت نام:</p>
                    <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 8px;">
                        <h1 style="color: #667eea; font-size: 36px; margin: 0;">${verificationCode}</h1>
                    </div>
                    <p style="color: #666; font-size: 14px;">این کد به مدت ۱۰ دقیقه معتبر است</p>
                </div>
            `
        });
        
        res.json({ 
            success: true,
            message: 'کد تایید به ایمیل شما ارسال شد' 
        });
    } catch (error) {
        console.error('خطا در ارسال ایمیل:', error);
        res.status(500).json({ 
            success: false,
            message: 'خطا در ارسال ایمیل' 
        });
    }
});

// Route تایید کد
app.post('/api/verify', (req, res) => {
    const { email, code } = req.body;
    
    if (!email || !code) {
        return res.status(400).json({
            success: false,
            message: 'ایمیل و کد تایید الزامی است'
        });
    }
    
    const verificationData = verificationCodes.get(email);
    
    if (!verificationData) {
        return res.status(400).json({ 
            success: false,
            message: 'کد تایید یافت نشد' 
        });
    }
    
    if (Date.now() > verificationData.expires) {
        verificationCodes.delete(email);
        return res.status(400).json({ 
            success: false,
            message: 'کد تایید منقضی شده است' 
        });
    }
    
    if (verificationData.code !== code) {
        return res.status(400).json({ 
            success: false,
            message: 'کد تایید نامعتبر است' 
        });
    }
    
    // کد صحیح است
    verificationCodes.delete(email);
    
    res.json({ 
        success: true,
        message: 'ایمیل با موفقیت تایید شد!',
        username: verificationData.username
    });
});

app.listen(PORT, () => {
    console.log(`🚀 سرور در پورت ${PORT} اجرا شد`);
    console.log(`📧 آدرس: http://localhost:${PORT}`);
});