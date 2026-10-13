# BojoiDuty - Firebase Cloud Function LINE Webhook

ฟังก์ชัน Webhook สำหรับ LINE Messaging API ทำงานบน Firebase Cloud Functions (v2) โดยเฉพาะ

## ข้อมูล Endpoint ของโปรเจกต์นี้
- **Firebase Project ID**: `feisty-quasar-q53bd`
- **Webhook URL (ภูมิภาคใกล้ไทย asia-southeast1)**:
  `https://asia-southeast1-feisty-quasar-q53bd.cloudfunctions.net/lineWebhook`
- **Webhook URL (us-central1)**:
  `https://us-central1-feisty-quasar-q53bd.cloudfunctions.net/lineWebhookUs`

## จุดเด่นเมื่อใช้ผ่าน Firebase Cloud Function
1. **Public HTTPS จริง 100%**: ไม่มี Session Cookie หรือ Auth Proxy ของ Google AI Studio มาบล็อก ทำให้กดปุ่ม **"Verify"** ใน LINE Developers Console แล้วได้ **Success (HTTP 200)** ทันที
2. **Auto-Reply & ดึง User ID อัตโนมัติ**: เมื่อผู้ใช้พิมพ์ข้อความใดๆ หรือสแกนแอดเพื่อนบอท บอทจะตอบกลับพร้อมระบุ **LINE User ID** (`U1234...`) ของคนนั้นทันที ทำให้เจ้าหน้าที่คัดลอก User ID มาใส่ในระบบตารางเวรได้ง่ายดาย
3. **เสถียร & ขยายขนาดอัตโนมัติ (Serverless)**: รองรับการเรียกจาก LINE ตลอด 24 ชม.

## คำสั่งสำหรับ Deploy
```bash
firebase deploy --only functions
```
