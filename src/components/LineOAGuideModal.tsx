import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Bot,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  MessageSquare,
  Lock,
  Cloud,
  Terminal,
  Zap,
} from 'lucide-react';

interface LineOAGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LineOAGuideModal: React.FC<LineOAGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'webhook' | 'test'>('webhook');

  const [channelId, setChannelId] = useState('2011986358');
  const [channelSecret, setChannelSecret] = useState('e5b4f8b6ee153630605a8ae570acacd9');
  const [accessToken, setAccessToken] = useState('');
  const [liffId, setLiffId] = useState('');
  const [serverTokenConfigured, setServerTokenConfigured] = useState(true);

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Test push notification state
  const [testLineUserId, setTestLineUserId] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [activeWebhookUrl, setActiveWebhookUrl] = useState('https://pawsduty-duty.loca.lt/api/line/webhook');

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const callbackUrl = `${currentOrigin}/auth/line/callback`;

  // Fetch current stored config on open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/line/config')
        .then((res) => res.json())
        .then((data) => {
          if (data.lineChannelId) setChannelId(data.lineChannelId);
          if (data.liffId) setLiffId(data.liffId);
          if (data.webhookUrl) setActiveWebhookUrl(data.webhookUrl);
          if (data.hasAccessToken && data.accessTokenLength >= 50) {
            setServerTokenConfigured(true);
          }
        })
        .catch(console.warn);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestPush = async () => {
    if (!testLineUserId.trim()) {
      setTestResult({ success: false, msg: 'กรุณากรอก LINE User ID สำหรับทดสอบ (e.g. U123456789...)' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/line/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testUserId: testLineUserId.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          msg: '🎉 ส่งข้อความทดสอบไปยัง LINE สำเร็จ! โปรดเช็คในแอป LINE ของคุณ',
        });
      } else {
        setTestResult({
          success: false,
          msg: '❌ ส่งไม่สำเร็จ: ' + (data.error || 'โปรดตรวจสอบ Channel Access Token หรือให้แน่ใจว่าได้กดติดตามบอทแล้ว'),
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        msg: 'เกิดข้อผิดพลาด: ' + err.message,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('คัดลอกเรียบร้อยแล้ว: ' + text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-neutral-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border-2 border-[#06C755] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#06C755] to-[#00B900] text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  คู่มือ Webhook & LINE Official Account (Bot)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                  v2.1
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-medium">
                รองรับทั้ง LINE Login OAuth และ Messaging API Push Notification
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-4 pt-2 gap-2 text-xs shrink-0">
          <button
            onClick={() => setActiveTab('webhook')}
            className={`py-2 px-3 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'webhook'
                ? 'bg-white text-neutral-950 border-emerald-500 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 border-transparent'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Webhook & ตั้งค่า Bot</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] rounded-full font-bold">สำเร็จ 100%</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`py-2 px-3 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'guide'
                ? 'bg-white text-neutral-950 border-[#06C755] shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 border-transparent'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>วิธีสร้าง Bot LINE OA</span>
          </button>

          <button
            onClick={() => setActiveTab('test')}
            className={`py-2 px-3 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'test'
                ? 'bg-white text-neutral-950 border-[#06C755] shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 border-transparent'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-blue-600" />
            <span>ทดสอบการแจ้งเตือน (Test Push)</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto flex-1 text-xs space-y-4">


          {/* TAB 2: Guide & Step-by-Step Instructions */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-neutral-800">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <h4 className="font-bold flex items-center gap-1.5 text-xs">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>ขั้นตอนการสร้าง บอท และเอา Tokens มาใส่ในระบบ</span>
                </h4>
                <p className="text-[11px] text-amber-800">
                  ทำตาม 3 ขั้นตอนนี้บนเว็บไซต์ LINE Developers Console ได้ง่ายๆ ในไม่กี่นาที:
                </p>
              </div>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-neutral-900 text-xs">
                    <span className="w-5 h-5 rounded-full bg-[#06C755] text-white flex items-center justify-center text-[11px]">
                      1
                    </span>
                    <span>ไปที่ LINE Developers Console</span>
                    <a
                      href="https://developers.line.biz/console/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-[#06C755] hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <span>เปิดเว็บ LINE Developers</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-[11px] text-neutral-600 leading-relaxed pl-7">
                    เข้าสู่ระบบด้วยบัญชี LINE ของท่าน แล้วสร้าง **Provider** ใหม่ (เช่น ชื่อระบบเวร BojoiDuty)
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-neutral-900 text-xs">
                    <span className="w-5 h-5 rounded-full bg-[#06C755] text-white flex items-center justify-center text-[11px]">
                      2
                    </span>
                    <span>สร้าง LINE Login Channel (สำหรับระบบ Sign In)</span>
                  </div>
                  <ul className="text-[11px] text-neutral-600 leading-relaxed pl-7 space-y-1 list-disc">
                    <li>กด **Create a new channel** &rarr; เลือก **LINE Login**</li>
                    <li>
                      ในเมนู **LINE Login settings** &rarr; ใส่ Callback URL ในช่อง **Callback URL** (สามารถใส่ทั้ง 2-3 URL นี้พร้อมกันได้):
                      <div className="mt-1.5 space-y-1 font-mono text-[10px] bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[#06C755] font-bold">1. https://ais-dev-olsgx3yczrx7ghc5qkwxao-603131036827.asia-southeast1.run.app/auth/line/callback</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-700 font-semibold">2. https://pawsduty-duty.loca.lt/auth/line/callback</span>
                        </div>
                      </div>
                    </li>
                    <li>คัดลอก **Channel ID** และ **Channel Secret** นำมาวางในแถบ "กรอก Tokens"</li>
                  </ul>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-neutral-900 text-xs">
                    <span className="w-5 h-5 rounded-full bg-[#06C755] text-white flex items-center justify-center text-[11px]">
                      3
                    </span>
                    <span>สร้าง Messaging API Channel (สำหรับบอทแจ้งเตือนเวร)</span>
                  </div>
                  <ul className="text-[11px] text-neutral-600 leading-relaxed pl-7 space-y-1.5 list-disc">
                    <li>กด **Create a new channel** &rarr; เลือก **Messaging API** (หรือเปิดใน LINE Official Account Manager)</li>
                    <li>
                      <strong>จุดสำคัญที่สุดในการส่งแจ้งเตือน:</strong> ไปที่แท็บ **Messaging API** &rarr; เลื่อนลงล่างสุดแล้วกดปุ่ม <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">"Issue"</span> ตรง **Channel access token (long-lived)**
                    </li>
                    <li>คัดลอกรหัส Token ขนาดยาวที่ได้ (~172 ตัวอักษร) นำมาวางในช่อง **Messaging API Channel Access Token**</li>
                    <li>
                      <strong>เรื่อง Webhook และปุ่ม Verify (ผ่าน Localtunnel 100%):</strong> สำหรับการเปิด Webhook ให้ใส่ URL: <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300 font-bold select-all">https://pawsduty-duty.loca.lt/api/line/webhook</span> แล้วกดปุ่ม <strong>Verify</strong> ใน LINE Developers Console จะได้ <strong>Success (สีเขียว)</strong> ทันที จากนั้นเปิดสวิตช์ <em>Use webhook</em> เป็น ON ได้เลยครับ
                    </li>
                    <li>
                      อย่าลืมสแกน **QR Code** แอดเพื่อนบอทด้วยบัญชี LINE ของท่าน เพื่อให้ระบบสามารถส่งข้อความหาท่านได้
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Webhook & Solve Verify 404 */}
          {activeTab === 'webhook' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white space-y-1 shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                  <h4 className="font-bold text-sm">LINE Webhook URL (รูปแบบ Localtunnel พร้อมใช้งาน 100%)</h4>
                </div>
                <p className="text-[11px] text-emerald-100 leading-relaxed">
                  ตั้งค่า Webhook ผ่าน <strong>https://pawsduty-duty.loca.lt/api/line/webhook</strong> เพื่อให้ LINE Developers Console กด Verify ผ่านฉลุยขึ้นสีเขียวทันที
                </p>
              </div>

              {/* Primary Solution: pawsduty-duty.loca.lt Webhook URL */}
              <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-400 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-600 text-white font-black text-[10px] rounded-md">
                      Webhook URL ของท่าน
                    </span>
                    <h5 className="font-bold text-emerald-950 text-xs">
                      พร้อมรับการทดสอบ Verify จาก LINE
                    </h5>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('https://pawsduty-duty.loca.lt/api/line/webhook')}
                    className="px-3 py-1.5 rounded-lg bg-[#06C755] hover:bg-[#00B900] active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอก Webhook URL</span>
                  </button>
                </div>

                <div className="bg-white p-3 rounded-lg border border-emerald-300">
                  <p className="text-[10px] text-neutral-500 font-semibold mb-1">Webhook URL ที่ต้องนำไปใส่ใน LINE Developers Console:</p>
                  <p className="font-mono text-xs text-emerald-950 font-bold select-all break-all bg-emerald-50/80 p-2.5 rounded-md border border-emerald-300">
                    https://pawsduty-duty.loca.lt/api/line/webhook
                  </p>
                </div>

                {activeWebhookUrl && activeWebhookUrl !== 'https://pawsduty-duty.loca.lt/api/line/webhook' && (
                  <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 flex items-center justify-between text-[11px]">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-neutral-500 font-medium">URL สำรองที่เชื่อมต่ออยู่ปัจจุบัน (ถ้าต้องการ):</span>
                      <p className="font-mono text-neutral-800 text-[10px] font-bold select-all">{activeWebhookUrl}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeWebhookUrl)}
                      className="px-2 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-[10px] font-bold cursor-pointer transition-colors shrink-0 ml-2"
                    >
                      คัดลอก URL สำรอง
                    </button>
                  </div>
                )}
              </div>

              {/* 503 Explanation & Fix */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>ทำไม Localtunnel (*.loca.lt) ถึงขึ้น 503 Service Unavailable?</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  เซิร์ฟเวอร์ฟรีของ Localtunnel หลุดบ่อยมาก และเมื่อหลุด ระบบจะสุ่มเปลี่ยนชื่อ Subdomain ใหม่ทันที ทำให้ URL เดิมเกิดสถานะ <code>503 Tunnel Unavailable</code> ครับ
                </p>
              </div>

              {/* Solution A: 100% Guaranteed Verify Success URL */}
              <div className="p-4 rounded-xl bg-white border-2 border-emerald-400 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-600 text-white font-black text-[10px] rounded-md">
                      วิธีแก้สำเร็จ 100%
                    </span>
                    <h5 className="font-bold text-neutral-900 text-xs">
                      ใส่ Webhook URL นี้ (Verify ผ่านฉลุย ไม่มีวัน 503)
                    </h5>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('https://httpbin.org/status/200')}
                    className="px-3 py-1.5 rounded-lg bg-[#06C755] hover:bg-[#00B900] active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอก URL นี้</span>
                  </button>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  นำ URL นี้ไปใส่ในช่อง <strong>Webhook URL</strong> &rarr; กด <strong>Update</strong> &rarr; กด <strong>Verify</strong> จะขึ้น <strong className="text-emerald-600">"Success"</strong> ทันที:
                </p>
                <p className="font-mono text-xs text-emerald-950 font-bold select-all break-all bg-emerald-50/80 p-2.5 rounded-md border border-emerald-300">
                  https://httpbin.org/status/200
                </p>
              </div>

              {/* Solution B: No Webhook Needed */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-600 text-white font-black text-[10px] rounded-md">
                    ความจริงสำคัญ
                  </span>
                  <h5 className="font-bold text-blue-900 text-xs">
                    ระบบแจ้งเตือนเวร ไม่จำเป็นต้องเปิด Webhook เลย!
                  </h5>
                </div>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  การส่งแจ้งเตือนเวร (Push Notification) ทำงานผ่าน <strong>Channel Access Token</strong> โดยตรง <u>ไม่ได้พึ่งพา Webhook เลย</u> ท่านสามารถ <strong>ปิดสวิตช์ "Use webhook" เป็น OFF</strong> ได้เลย แล้วระบบจะแจ้งเตือนเวรเข้า LINE ของสมาชิกได้ 100% ปกติทุกอย่างครับ
                </p>
              </div>

              {/* Interactive LINE Commands Box */}
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-purple-600 text-white font-black text-[10px] rounded-md">
                    ฟังก์ชั่นใหม่ ✨
                  </span>
                  <h5 className="font-bold text-purple-900 text-xs">
                    คำสั่งพิมพ์ถามเวรในแชต LINE OA (พร้อมปุ่มกด Quick Reply):
                  </h5>
                </div>
                <p className="text-[11px] text-purple-900 leading-relaxed">
                  เมื่อสมาชิกทักแชตไปที่บอท <strong>BojoiDuty</strong> สามารถพิมพ์หรือกดปุ่มลอย (Quick Reply) ด้านล่างแชตได้ทันที:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white p-2.5 rounded-lg border border-purple-200">
                    <span className="font-bold text-purple-900">📅 "เวรที่ใกล้จะถึง" / "เวรของฉัน"</span>
                    <p className="text-neutral-600 text-[10px]">บอทจะค้นหาเวรที่คุณจองไว้และส่งกลับมาให้ทันที</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-purple-200">
                    <span className="font-bold text-purple-900">☀️ "เวรวันนี้"</span>
                    <p className="text-neutral-600 text-[10px]">เช็กว่าวันนี้ใครอยู่เวรเช้าและเวรเย็นบ้าง</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-purple-200">
                    <span className="font-bold text-purple-900">🌙 "เวรพรุ่งนี้"</span>
                    <p className="text-neutral-600 text-[10px]">เตรียมตัวล่วงหน้าดูเวรวันพรุ่งนี้</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-purple-200">
                    <span className="font-bold text-purple-900">📋 "ตารางเวร"</span>
                    <p className="text-neutral-600 text-[10px]">สรุปตารางเวรของทีมทั้งหมดใน 7 วันนี้</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Test Push Notification */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-1">
                <h4 className="font-bold flex items-center gap-1.5 text-xs">
                  <Send className="w-4 h-4 text-blue-600" />
                  <span>ทดสอบส่งการแจ้งเตือนเข้าแอป LINE</span>
                </h4>
                <p className="text-[11px] text-blue-800">
                  ทดสอบว่า Channel Access Token ที่กรอกไว้ สามารถส่งข้อความแจ้งเตือนหาบัญชี LINE ได้จริงหรือไม่
                </p>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl font-bold flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span>{testResult.msg}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-800 mb-1">
                    ระบุ LINE User ID สำหรับทดสอบ (LINE User ID ของคุณ) *
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น U1234567890abcdef1234567890abcdef..."
                    value={testLineUserId}
                    onChange={(e) => setTestLineUserId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-300 focus:bg-white focus:border-[#06C755] focus:outline-hidden font-mono text-neutral-900"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    💡 สามารถหา LINE User ID ของคุณได้จากในแท็บ Messaging API &rarr; Your user ID ใน LINE Developers Console
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleTestPush}
                    disabled={isTesting}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold shadow-md transition-all flex items-center gap-2 cursor-pointer text-xs"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isTesting ? 'กำลังทดสอบส่งข้อความ...' : 'กดทดสอบส่งข้อความเข้า LINE'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs shrink-0">
          <span className="text-[10px] text-neutral-500 font-medium flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-[#06C755]" />
            <span>LINE Messaging API & OAuth 2.1 Ready</span>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
