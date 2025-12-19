const { 
    default: makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const { EventEmitter } = require('events');
const fs = require('fs-extra');
const path = require('path');

class WhatsAppService extends EventEmitter {
    constructor() {
        super();
        this.sock = null;
        this.isConnected = false;
        this.connectedNumber = null;
        this.authDir = path.join(__dirname, '..', 'auth_info_baileys');
        this.qrRetries = 0;
        this.maxQrRetries = 3;
        this.keepAliveInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
    }

    async initialize(phoneNumber = null) {
        try {
            console.log('🔄 تهيئة خدمة WhatsApp...');
            
            if (phoneNumber) {
                console.log('📱 رقم الهاتف المحدد:', phoneNumber);
            }
            
            // Ensure auth directory exists
            await fs.ensureDir(this.authDir);
            
            // Get latest Baileys version
            const { version, isLatest } = await fetchLatestBaileysVersion();
            console.log(`📱 استخدام Baileys v${version.join('.')}, أحدث إصدار: ${isLatest}`);
            
            // Load auth state
            const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
            
            // Create socket configuration
            const socketConfig = {
                version,
                auth: state,
                printQRInTerminal: false,
                logger: {
                    level: 'silent',
                    child: () => ({ 
                        level: 'silent',
                        trace: () => {},
                        debug: () => {},
                        info: () => {},
                        warn: () => {},
                        error: () => {},
                        fatal: () => {}
                    }),
                    trace: () => {},
                    debug: () => {},
                    info: () => {},
                    warn: () => {},
                    error: () => {},
                    fatal: () => {}
                },
                browser: ['WhatsApp Bot', 'Chrome', '1.0.0'],
                generateHighQualityLinkPreview: true,
                syncFullHistory: false,
                markOnlineOnConnect: true
            };

            // If phone number is provided, add it to config
            if (phoneNumber && this.isValidWhatsAppNumber(phoneNumber)) {
                const formattedNumber = this.formatWhatsAppJid(phoneNumber);
                console.log('📱 استخدام رقم مخصص:', formattedNumber);
                // Note: Baileys doesn't directly support phone number in config
                // The QR code will still be generated normally
            }

            // Create socket
            this.sock = makeWASocket(socketConfig);

            // Handle connection updates
            this.sock.ev.on('connection.update', (update) => {
                this.handleConnectionUpdate(update);
            });

            // Handle credentials update
            this.sock.ev.on('creds.update', saveCreds);

            // Handle messages
            this.sock.ev.on('messages.upsert', (m) => {
                this.handleMessages(m);
            });

            console.log('✅ تم تهيئة خدمة WhatsApp بنجاح');
            
        } catch (error) {
            console.error('❌ خطأ في تهيئة WhatsApp:', error);
            throw error;
        }
    }

    handleConnectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('📱 تم إنشاء رمز QR');
            this.qrRetries++;
            this.emit('qr', qr);
            
            if (this.qrRetries >= this.maxQrRetries) {
                console.log('⚠️ تم الوصول للحد الأقصى من محاولات QR');
                this.emit('error', 'انتهت صلاحية رمز QR. يرجى المحاولة مرة أخرى.');
            }
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            const reason = lastDisconnect?.error?.output?.statusCode;
            
            console.log('🔌 انقطع الاتصال:', this.getDisconnectReason(reason));
            
            this.isConnected = false;
            this.emit('disconnected');
            
            if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                const delay = Math.min(5000 * this.reconnectAttempts, 30000); // Max 30 seconds
                console.log(`🔄 محاولة إعادة الاتصال (${this.reconnectAttempts}/${this.maxReconnectAttempts}) خلال ${delay/1000} ثانية...`);
                
                setTimeout(() => {
                    this.initialize().catch(console.error);
                }, delay);
            } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.log('❌ فشل في إعادة الاتصال بعد عدة محاولات');
                this.stopKeepAlive();
                this.emit('error', 'فشل في إعادة الاتصال. يرجى إعادة تشغيل البوت.');
            } else {
                console.log('🚪 تم تسجيل الخروج من WhatsApp');
                this.stopKeepAlive();
                this.clearAuthData();
            }
        } else if (connection === 'open') {
            console.log('✅ تم الاتصال بـ WhatsApp بنجاح');
            this.isConnected = true;
            this.qrRetries = 0;
            this.reconnectAttempts = 0;
            
            // Start keep-alive mechanism
            this.startKeepAlive();
            
            const user = this.sock.user;
            this.connectedNumber = user?.id || 'متصل';
            console.log('📱 الرقم المتصل:', this.connectedNumber);
            this.emit('ready', user);
        }
    }

    handleMessages(m) {
        try {
            const messages = m.messages;
            
            for (const message of messages) {
                // Skip if message is from status broadcast
                if (message.key.remoteJid === 'status@broadcast') continue;
                
                // Skip if message is from self
                if (message.key.fromMe) continue;
                
                // Skip if message is older than 1 minute (to avoid processing old messages)
                const messageTime = message.messageTimestamp * 1000;
                const now = Date.now();
                if (now - messageTime > 60000) continue;
                
                console.log('📨 رسالة جديدة من:', message.pushName || message.key.remoteJid);
                this.emit('message', message);
            }
        } catch (error) {
            console.error('❌ خطأ في معالجة الرسائل:', error);
        }
    }

    async sendMessage(jid, text, options = {}) {
        try {
            if (!this.sock || !this.isConnected) {
                throw new Error('WhatsApp غير متصل');
            }

            // Show typing indicator if requested
            if (options.showTyping !== false) {
                await this.sendTyping(jid, options.typingDuration || 2000);
            }
            
            await this.sock.sendMessage(jid, { text });
            console.log('✅ تم إرسال الرسالة إلى:', jid);
            
        } catch (error) {
            console.error('❌ خطأ في إرسال الرسالة:', error);
            throw error;
        }
    }

    async sendTyping(jid, duration = 2000) {
        try {
            if (!this.sock || !this.isConnected) {
                return;
            }

            // Send typing indicator
            await this.sock.sendPresenceUpdate('composing', jid);
            
            // Wait for specified duration
            await new Promise(resolve => setTimeout(resolve, duration));
            
            // Stop typing indicator
            await this.sock.sendPresenceUpdate('paused', jid);
            
        } catch (error) {
            console.error('❌ خطأ في إرسال مؤشر الكتابة:', error);
        }
    }

    async sendImage(jid, imagePath, caption = '') {
        try {
            if (!this.sock || !this.isConnected) {
                throw new Error('WhatsApp غير متصل');
            }
            
            const imageBuffer = await fs.readFile(imagePath);
            await this.sock.sendMessage(jid, {
                image: imageBuffer,
                caption: caption
            });
            
            console.log('✅ تم إرسال الصورة إلى:', jid);
            
        } catch (error) {
            console.error('❌ خطأ في إرسال الصورة:', error);
            throw error;
        }
    }

    async sendToAdmins(message, adminNumbers) {
        try {
            if (!adminNumbers || adminNumbers.length === 0) {
                console.log('⚠️ لا توجد أرقام إدارة محددة');
                return;
            }

            for (const adminNumber of adminNumbers) {
                try {
                    const jid = adminNumber.includes('@') ? adminNumber : `${adminNumber}@s.whatsapp.net`;
                    await this.sendMessage(jid, message, { showTyping: false });
                    console.log('✅ تم إرسال إشعار للإدارة:', adminNumber);
                } catch (error) {
                    console.error(`❌ خطأ في إرسال إشعار للإدارة ${adminNumber}:`, error);
                }
            }
        } catch (error) {
            console.error('❌ خطأ في إرسال الإشعارات للإدارة:', error);
        }
    }

    async sendAppointmentNotification(appointment, adminNumbers) {
        const message = `🗓️ موعد جديد مجدول\n\n` +
                       `👤 العميل: ${appointment.clientName}\n` +
                       `📱 الهاتف: ${appointment.clientPhone}\n` +
                       `📅 التاريخ: ${appointment.date}\n` +
                       `⏰ الوقت: ${appointment.time}\n` +
                       `📝 الملاحظات: ${appointment.notes || 'لا توجد'}\n` +
                       `🏠 العقار المطلوب: ${appointment.propertyId || 'غير محدد'}\n\n` +
                       `يرجى التواصل مع العميل لتأكيد الموعد.`;
        
        await this.sendToAdmins(message, adminNumbers);
    }

    async sendInquiryNotification(inquiry, adminNumbers) {
        const message = `❓ استفسار جديد\n\n` +
                       `👤 العميل: ${inquiry.clientName}\n` +
                       `📱 الهاتف: ${inquiry.clientPhone}\n` +
                       `📝 الاستفسار: ${inquiry.message}\n` +
                       `🏠 العقار: ${inquiry.propertyId || 'غير محدد'}\n` +
                       `⏰ الوقت: ${new Date(inquiry.createdAt).toLocaleString('ar-EG')}\n\n` +
                       `يرجى الرد على العميل في أقرب وقت.`;
        
        await this.sendToAdmins(message, adminNumbers);
    }

    startKeepAlive() {
        // Stop any existing keep-alive
        this.stopKeepAlive();
        
        // Send presence update every 30 seconds to keep connection alive
        this.keepAliveInterval = setInterval(async () => {
            try {
                if (this.sock && this.isConnected) {
                    await this.sock.sendPresenceUpdate('available');
                    console.log('💓 Keep-alive signal sent');
                }
            } catch (error) {
                console.error('❌ خطأ في keep-alive:', error);
            }
        }, 30000); // 30 seconds
        
        console.log('✅ تم تفعيل نظام keep-alive');
    }

    stopKeepAlive() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
            console.log('🛑 تم إيقاف نظام keep-alive');
        }
    }

    async disconnect() {
        try {
            // Stop keep-alive first
            this.stopKeepAlive();
            
            if (this.sock) {
                console.log('🔌 قطع الاتصال مع WhatsApp...');
                
                // Only try to logout if we're actually connected
                if (this.isConnected) {
                    try {
                        await this.sock.logout();
                    } catch (logoutError) {
                        console.log('⚠️ تحذير: خطأ في تسجيل الخروج (الاتصال مقطوع بالفعل):', logoutError.message);
                    }
                }
                
                this.sock = null;
                this.isConnected = false;
                this.connectedNumber = null;
                this.user = null;
                this.reconnectAttempts = 0;
                await this.clearAuthData();
                console.log('✅ تم قطع الاتصال بنجاح');
            }
        } catch (error) {
            console.error('❌ خطأ في قطع الاتصال:', error);
            // Force cleanup even if there's an error
            this.sock = null;
            this.isConnected = false;
            this.user = null;
            this.reconnectAttempts = 0;
            await this.clearAuthData();
        }
    }

    async clearAuthData() {
        try {
            if (await fs.pathExists(this.authDir)) {
                await fs.remove(this.authDir);
                console.log('🗑️ تم مسح بيانات المصادقة');
            }
        } catch (error) {
            console.error('❌ خطأ في مسح بيانات المصادقة:', error);
        }
    }

    getDisconnectReason(statusCode) {
        const reasons = {
            [DisconnectReason.badSession]: 'جلسة سيئة',
            [DisconnectReason.connectionClosed]: 'تم إغلاق الاتصال',
            [DisconnectReason.connectionLost]: 'فقدان الاتصال',
            [DisconnectReason.connectionReplaced]: 'تم استبدال الاتصال',
            [DisconnectReason.loggedOut]: 'تم تسجيل الخروج',
            [DisconnectReason.multideviceMismatch]: 'عدم تطابق الأجهزة المتعددة',
            [DisconnectReason.forbidden]: 'محظور',
            [DisconnectReason.restartRequired]: 'مطلوب إعادة التشغيل',
            [DisconnectReason.timedOut]: 'انتهت المهلة الزمنية'
        };
        
        return reasons[statusCode] || `سبب غير معروف (${statusCode})`;
    }

    // Utility methods
    isValidWhatsAppNumber(number) {
        // Remove all non-digit characters
        const cleanNumber = number.replace(/\D/g, '');
        
        // Check if it's a valid length (typically 10-15 digits)
        return cleanNumber.length >= 10 && cleanNumber.length <= 15;
    }

    formatWhatsAppJid(number) {
        // Remove all non-digit characters
        const cleanNumber = number.replace(/\D/g, '');
        
        // Add country code if not present (assuming Saudi Arabia +966)
        let formattedNumber = cleanNumber;
        if (!formattedNumber.startsWith('20') && formattedNumber.startsWith('5')) {
            formattedNumber = '20' + formattedNumber;
        }
        
        return formattedNumber + '@s.whatsapp.net';
    }

    // Get connection status
    getStatus() {
        return {
            connected: this.isConnected,
            user: this.sock?.user || null,
            authExists: fs.existsSync(this.authDir)
        };
    }
}

module.exports = WhatsAppService;