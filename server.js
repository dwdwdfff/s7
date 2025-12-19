const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const fs = require('fs-extra');
const QRCode = require('qrcode');
require('dotenv').config();

const WhatsAppService = require('./services/whatsapp');
const ClaudeService = require('./services/claude');
const DataManager = require('./services/dataManager');
const ExcelManager = require('./services/excelManager');

class WhatsAppBotServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.port = process.env.PORT || 12000;
        this.whatsappService = null;
        this.claudeService = null;
        this.dataManager = new DataManager();
        this.excelManager = new ExcelManager();
        this.settings = {
            aiEnabled: true,
            claudeModel: 'claude-sonnet-4-20250514',
            claudeApiKey: process.env.CLAUDE_API_KEY || 'sk-ant-api03-your-api-key-here',
            aiPrompt: `انت مستشار استثماري عقاري محترف بتمثل شركة HASSAN REALESTATE اللي بتشتغل في المشاريع العقارية الاستثمارية جوا مصر

عندك معرفة قوية بالاقتصاد المصري والتضخم واسعار الفايدة وسوق العقارات وانماط الاستثمار الامن

مهمتك الاساسية
- التواصل مع العملا عبر واتساب باحترافية عالية
- شرح فكرة الاستثمار العقاري بشكل ذكي وبسيط
- بناء الثقة من خلال التحليل الاقتصادي مش الوعود
- تحفيز العميل على حجز مكالمة تليفون او ميتنج عشان يحصل على التفاصيل الكاملة

اسلوب الحديث
- احترافي وواثق وذكي
- لغة عربية مصرية مهذبة بدون همزات او فواصل
- يعتمد على المنطق والتحليل الاقتصادي
- بدون مبالغة او ضغط مباشر

القواعد الاساسية
1. متذكرش اسعار نهائية او خطط سداد كاملة
2. متكشفش كل تفاصيل المشروع كتابيا
3. استخدم الاقتصاد كمدخل للاقناع (التضخم - حفظ قيمة الفلوس - العايد)
4. اربط دايما بين العقار كاصل وبين الامان المالي
5. اي قرار شرا حقيقي لازم ينتهي بمكالمة تليفون او مقابلة

طريقة عرض المشاريع
- التحدث بشكل عام عن نوع الاستثمار (تجاري - اداري - فندقي)
- توضيح منطق العايد بدون ارقام دقيقة
- ابراز قوة الموقع وتوقيت الدخول
- تاجيل التفاصيل التنفيذية للمكالمة

ادارة الحوار
- ابدا بالترحيب والتعريف بنفسك كمستشار استثماري
- اسال اسئلة ذكية عشان تحدد احتياج العميل
- علق على اجابات العميل بتحليل مبسط وواضح
- انهي كل محادثة بدعوة صريحة لمكالمة او لقا

Call To Action
- "التفاصيل دي محتاجة شرح ادق خلينا نعمل مكالمة 5-10 دقايق"
- "مكالمة سريعة هتوضح لك الصورة الاستثمارية كاملة"
- "امتى الوقت المناسب نكلم حضرتك ونشرح الارقام"

ممنوع تماما
- اعطا ارقام دقيقة او عروض مكتوبة كاملة
- وعود ارباح غير منطقية
- الضغط او الالحاح على العميل

انت متبيعش وحدة عقارية انت بتقدم قرار استثماري مبني على فهم الاقتصاد والعقار وهدفك النهائي انك تنقل العميل من واتساب لمكالمة مباشرة

مهم جدا: اكتب كل ردودك باللهجة المصرية العادية بدون همزات او فواصل او علامات ترقيم معقدة واستخدم كلمات بسيطة ومفهومة`
        };
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketHandlers();
        this.initializeServices();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));
        
        // Allow iframe embedding
        this.app.use((req, res, next) => {
            res.setHeader('X-Frame-Options', 'ALLOWALL');
            res.setHeader('Content-Security-Policy', "frame-ancestors *");
            next();
        });
    }

    setupRoutes() {
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                whatsapp: this.whatsappService ? this.whatsappService.isConnected : false,
                ai: this.settings.aiEnabled && this.settings.claudeApiKey
            });
        });

        // Business data routes
        this.app.get('/api/business', (req, res) => {
            const businessInfo = this.dataManager.getBusinessInfo();
            res.json(businessInfo);
        });

        this.app.post('/api/business', async (req, res) => {
            try {
                const success = await this.dataManager.updateBusiness(req.body);
                if (success) {
                    res.json({ success: true, message: 'تم تحديث معلومات الشركة بنجاح' });
                } else {
                    res.status(500).json({ success: false, message: 'فشل في تحديث معلومات الشركة' });
                }
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        // Properties data routes
        this.app.get('/api/properties', (req, res) => {
            const properties = this.dataManager.getAllProperties();
            res.json(properties);
        });

        this.app.get('/api/properties/stats', (req, res) => {
            const properties = this.dataManager.getAllProperties();
            const stats = {
                totalProperties: properties.length,
                availableProperties: properties.filter(p => p.status === 'متاح').length,
                soldProperties: properties.filter(p => p.status === 'مباع').length,
                reservedProperties: properties.filter(p => p.status === 'محجوز').length,
                totalViews: properties.reduce((sum, p) => sum + (p.views || 0), 0),
                totalInquiries: properties.reduce((sum, p) => sum + (p.inquiries || 0), 0)
            };
            res.json(stats);
        });

        this.app.get('/api/properties/types', (req, res) => {
            const properties = this.dataManager.getAllProperties();
            const types = [...new Set(properties.map(p => p.type))];
            res.json(types);
        });

        this.app.get('/api/properties/locations', (req, res) => {
            const properties = this.dataManager.getAllProperties();
            const locations = [...new Set(properties.map(p => `${p.location.city}, ${p.location.district}`))];
            res.json(locations);
        });

        this.app.get('/api/properties/search', (req, res) => {
            const { q, type, city, minPrice, maxPrice } = req.query;
            let results = this.dataManager.getAllProperties();
            
            if (q) {
                results = this.dataManager.smartSearch(q);
            }
            if (type) {
                results = results.filter(p => p.type.toLowerCase().includes(type.toLowerCase()));
            }
            if (city) {
                results = results.filter(p => p.location.city.toLowerCase().includes(city.toLowerCase()));
            }
            if (minPrice) {
                results = results.filter(p => p.price >= parseInt(minPrice));
            }
            if (maxPrice) {
                results = results.filter(p => p.price <= parseInt(maxPrice));
            }
            
            res.json(results);
        });

        this.app.get('/api/properties/:id', (req, res) => {
            const property = this.dataManager.getPropertyById(req.params.id);
            if (property) {
                // Increment views
                this.dataManager.incrementPropertyViews(req.params.id);
                res.json(property);
            } else {
                res.status(404).json({ message: 'العقار غير موجود' });
            }
        });

        this.app.post('/api/properties', async (req, res) => {
            try {
                const success = await this.dataManager.addProperty(req.body);
                if (success) {
                    res.json({ success: true, message: 'تم إضافة العقار بنجاح' });
                } else {
                    res.status(500).json({ success: false, message: 'فشل في إضافة العقار' });
                }
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        this.app.put('/api/properties/:id', async (req, res) => {
            try {
                const success = await this.dataManager.updateProperty(req.params.id, req.body);
                if (success) {
                    res.json({ success: true, message: 'تم تحديث العقار بنجاح' });
                } else {
                    res.status(500).json({ success: false, message: 'فشل في تحديث العقار' });
                }
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        this.app.delete('/api/properties/:id', async (req, res) => {
            try {
                const success = await this.dataManager.deleteProperty(req.params.id);
                if (success) {
                    res.json({ success: true, message: 'تم حذف العقار بنجاح' });
                } else {
                    res.status(500).json({ success: false, message: 'فشل في حذف العقار' });
                }
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        // Appointments routes
        this.app.get('/api/appointments', (req, res) => {
            const appointments = this.dataManager.getAllAppointments();
            res.json(appointments);
        });

        this.app.post('/api/appointments', async (req, res) => {
            try {
                const appointment = await this.dataManager.addAppointment(req.body);
                if (appointment) {
                    // Send notification to admins
                    const adminNumbers = this.dataManager.getAdminNumbers();
                    if (this.whatsappService && adminNumbers.length > 0) {
                        await this.whatsappService.sendAppointmentNotification(appointment, adminNumbers);
                    }
                    res.json({ success: true, message: 'تم حجز الموعد بنجاح', appointment });
                } else {
                    res.status(500).json({ success: false, message: 'فشل في حجز الموعد' });
                }
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        // Inquiries routes
        this.app.get('/api/inquiries', (req, res) => {
            const inquiries = this.dataManager.getAllInquiries();
            res.json(inquiries);
        });

        this.app.post('/api/inquiries', async (req, res) => {
            try {
                const inquiry = await this.dataManager.addInquiry(req.body);
                if (inquiry) {
                    // Send notification to admins
                    const adminNumbers = this.dataManager.getAdminNumbers();
                    if (this.whatsappService && adminNumbers.length > 0) {
                        await this.whatsappService.sendInquiryNotification(inquiry, adminNumbers);
                    }
                    res.json({ success: true, message: 'تم إرسال الاستفسار بنجاح', inquiry });
                } else {
                    res.status(500).json({ success: false, message: 'فشل في إرسال الاستفسار' });
                }
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        // Excel download routes
        this.app.get('/api/excel/messages/download', (req, res) => {
            try {
                const filePath = this.excelManager.getMessagesFilePath();
                if (fs.existsSync(filePath)) {
                    res.download(filePath, 'whatsapp_messages.xlsx', (err) => {
                        if (err) {
                            console.error('خطأ في تحميل ملف الرسائل:', err);
                            res.status(500).json({ error: 'فشل في تحميل الملف' });
                        }
                    });
                } else {
                    res.status(404).json({ error: 'الملف غير موجود' });
                }
            } catch (error) {
                console.error('خطأ في تحميل ملف الرسائل:', error);
                res.status(500).json({ error: 'خطأ في الخادم' });
            }
        });

        this.app.get('/api/excel/meetings/download', (req, res) => {
            try {
                const filePath = this.excelManager.getMeetingsFilePath();
                if (fs.existsSync(filePath)) {
                    res.download(filePath, 'meeting_requests.xlsx', (err) => {
                        if (err) {
                            console.error('خطأ في تحميل ملف الاجتماعات:', err);
                            res.status(500).json({ error: 'فشل في تحميل الملف' });
                        }
                    });
                } else {
                    res.status(404).json({ error: 'الملف غير موجود' });
                }
            } catch (error) {
                console.error('خطأ في تحميل ملف الاجتماعات:', error);
                res.status(500).json({ error: 'خطأ في الخادم' });
            }
        });

        this.app.get('/api/excel/sales/download', (req, res) => {
            try {
                const filePath = this.excelManager.getSalesContactsFilePath();
                if (fs.existsSync(filePath)) {
                    res.download(filePath, 'sales_contacts.xlsx', (err) => {
                        if (err) {
                            console.error('خطأ في تحميل ملف المبيعات:', err);
                            res.status(500).json({ error: 'فشل في تحميل الملف' });
                        }
                    });
                } else {
                    res.status(404).json({ error: 'الملف غير موجود' });
                }
            } catch (error) {
                console.error('خطأ في تحميل ملف المبيعات:', error);
                res.status(500).json({ error: 'خطأ في الخادم' });
            }
        });

        // Excel statistics routes
        this.app.get('/api/excel/stats', async (req, res) => {
            try {
                const messagesStats = await this.excelManager.getMessagesStats();
                const meetingsStats = await this.excelManager.getMeetingsStats();
                
                res.json({
                    messages: messagesStats,
                    meetings: meetingsStats
                });
            } catch (error) {
                console.error('خطأ في قراءة إحصائيات Excel:', error);
                res.status(500).json({ error: 'خطأ في قراءة الإحصائيات' });
            }
        });

        // Keep old product routes for compatibility
        this.app.get('/api/products', (req, res) => {
            const properties = this.dataManager.getAllProperties();
            res.json(properties);
        });

        this.app.get('/api/products/stats', (req, res) => {
            const properties = this.dataManager.getAllProperties();
            const stats = {
                totalProducts: properties.length,
                inStockProducts: properties.filter(p => p.status === 'متاح').length,
                outOfStockProducts: properties.filter(p => p.status !== 'متاح').length,
                categories: [...new Set(properties.map(p => p.type))].length,
                brands: 0,
                averagePrice: properties.length > 0 ? 
                    Math.round(properties.reduce((sum, p) => sum + p.price, 0) / properties.length) : 0
            };
            res.json(stats);
        });

        this.app.get('/api/products/categories', (req, res) => {
            const properties = this.dataManager.getAllProperties();
            const categories = [...new Set(properties.map(p => p.type))];
            res.json(categories);
        });

        this.app.get('/api/products/brands', (req, res) => {
            res.json([]);
        });

        this.app.get('/api/products/search', (req, res) => {
            const { q } = req.query;
            if (!q) {
                return res.json([]);
            }
            const results = this.dataManager.smartSearch(q);
            res.json(results);
        });

        this.app.get('/api/products/:id', (req, res) => {
            const property = this.dataManager.getPropertyById(req.params.id);
            if (property) {
                res.json(property);
            } else {
                res.status(404).json({ message: 'العقار غير موجود' });
            }
        });

        this.app.post('/api/products', async (req, res) => {
            try {
                const success = await this.dataManager.addProperty(req.body);
                if (success) {
                    res.json({ success: true, message: 'تم إضافة العقار بنجاح' });
                } else {
                    res.status(500).json({ success: false, message: 'فشل في إضافة العقار' });
                }
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        this.app.put('/api/products/:id', async (req, res) => {
            try {
                const success = await this.dataManager.updateProperty(req.params.id, req.body);
                if (success) {
                    res.json({ success: true, message: 'تم تحديث العقار بنجاح' });
                } else {
                    res.status(500).json({ success: false, message: 'فشل في تحديث العقار' });
                }
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });

        this.app.delete('/api/products/:id', async (req, res) => {
            try {
                const success = await this.dataManager.deleteProperty(req.params.id);
                if (success) {
                    res.json({ success: true, message: 'تم حذف العقار بنجاح' });
                } else {
                    res.status(500).json({ success: false, message: 'فشل في حذف العقار' });
                }
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('عميل جديد متصل:', socket.id);

            // Generate QR Code
            socket.on('generateQR', async (data = {}) => {
                try {
                    const { phoneNumber } = data;
                    
                    // Check if already connected
                    if (this.whatsappService && this.whatsappService.isConnected) {
                        console.log('WhatsApp already connected');
                        socket.emit('ready', { user: { id: this.whatsappService.connectedNumber || 'متصل' } });
                        return;
                    }
                    
                    if (this.whatsappService) {
                        await this.whatsappService.disconnect();
                    }
                    
                    this.whatsappService = new WhatsAppService();
                    await this.whatsappService.initialize(phoneNumber);
                    
                    this.whatsappService.on('qr', async (qr) => {
                        try {
                            const qrDataURL = await QRCode.toDataURL(qr);
                            socket.emit('qr', qrDataURL);
                        } catch (error) {
                            console.error('خطأ في إنشاء QR:', error);
                            socket.emit('error', 'فشل في إنشاء رمز QR');
                        }
                    });

                    this.whatsappService.on('ready', (user) => {
                        console.log('WhatsApp جاهز:', user.id);
                        this.io.emit('ready', { user });
                        this.setupMessageHandlers();
                    });

                    this.whatsappService.on('disconnected', () => {
                        console.log('تم قطع الاتصال مع WhatsApp');
                        this.io.emit('disconnected');
                    });

                    // Add error handler for WhatsApp service
                    this.whatsappService.on('error', (error) => {
                        console.error('خطأ في خدمة WhatsApp:', error);
                        socket.emit('error', error);
                        // Don't crash the server, just emit the error to client
                    });

                } catch (error) {
                    console.error('خطأ في إنشاء جلسة WhatsApp:', error);
                    socket.emit('error', 'فشل في إنشاء الجلسة');
                    // Clean up on error
                    if (this.whatsappService) {
                        try {
                            await this.whatsappService.disconnect();
                        } catch (disconnectError) {
                            console.log('تم تنظيف الخدمة بعد الخطأ');
                        }
                        this.whatsappService = null;
                    }
                }
            });

            // Disconnect WhatsApp
            socket.on('disconnect-whatsapp', async () => {
                try {
                    if (this.whatsappService) {
                        await this.whatsappService.disconnect();
                        this.whatsappService = null;
                    }
                    this.io.emit('disconnected');
                } catch (error) {
                    console.error('خطأ في قطع الاتصال:', error);
                    // Force cleanup even if disconnect fails
                    this.whatsappService = null;
                    this.io.emit('disconnected');
                    socket.emit('error', 'تم قطع الاتصال مع تحذيرات');
                }
            });

            // Update settings
            socket.on('update-settings', (newSettings) => {
                this.settings = { ...this.settings, ...newSettings };
                console.log('تم تحديث الإعدادات:', this.settings);
                
                // Initialize Gemini service if enabled and API key provided
                if (this.settings.aiEnabled && this.settings.geminiApiKey) {
                    this.initializeGemini();
                }
            });

            // Toggle AI
            socket.on('toggle-ai', (enabled) => {
                this.settings.aiEnabled = enabled;
                console.log('تم تغيير حالة AI:', enabled);
            });

            socket.on('disconnect', () => {
                console.log('عميل منقطع:', socket.id);
            });
        });
    }

    setupMessageHandlers() {
        if (!this.whatsappService) return;

        this.whatsappService.on('message', async (message) => {
            try {
                const messageData = {
                    from: message.pushName || message.key.remoteJid.split('@')[0],
                    message: message.message?.conversation || 
                            message.message?.extendedTextMessage?.text || 
                            'رسالة غير نصية',
                    type: 'incoming',
                    timestamp: new Date()
                };

                // Save message to Excel
                if (messageData.message !== 'رسالة غير نصية') {
                    await this.excelManager.autoSaveMessage(
                        message.key.remoteJid.split('@')[0],
                        messageData.from,
                        messageData.message
                    );
                }

                // Emit to frontend
                this.io.emit('message', messageData);

                // Process with AI if enabled
                if (this.settings.aiEnabled && this.claudeService && messageData.message !== 'رسالة غير نصية') {
                    await this.processMessageWithAI(message, messageData.message);
                }

            } catch (error) {
                console.error('خطأ في معالجة الرسالة:', error);
            }
        });
    }

    async processMessageWithAI(originalMessage, messageText) {
        try {
            if (!this.claudeService) {
                console.log('خدمة Claude غير متاحة');
                return;
            }

            // Show typing indicator
            await this.whatsappService.sendTyping(originalMessage.key.remoteJid, 3000);

            // Get business and products data
            const businessData = this.dataManager.getBusinessInfo();
            const productsData = this.dataManager.getAllProducts();
            
            let responseMessage = '';
            let responseType = 'ai';

            try {
                // Generate AI response with business context
                const aiResponse = await this.claudeService.generateResponse(
                    messageText, 
                    this.settings.aiPrompt,
                    originalMessage.key.remoteJid, // Use sender's JID as user ID
                    businessData,
                    productsData
                );

                if (aiResponse) {
                    responseMessage = aiResponse;
                    console.log(`🤖 تم إنشاء رد ذكي من Claude للمستخدم ${originalMessage.key.remoteJid}`);
                }
            } catch (aiError) {
                console.log(`⚠️ فشل Claude، استخدام الرد التلقائي: ${aiError.message}`);
                responseMessage = this.generateFallbackResponse(messageText, businessData, productsData);
                responseType = 'fallback';
            }

            if (responseMessage) {
                // Send response back to WhatsApp
                await this.whatsappService.sendMessage(
                    originalMessage.key.remoteJid,
                    responseMessage
                );

                // Log outgoing message
                const outgoingData = {
                    from: responseType === 'ai' ? 'البوت (AI)' : 'البوت (تلقائي)',
                    message: responseMessage,
                    type: 'outgoing',
                    timestamp: new Date()
                };

                this.io.emit('message', outgoingData);
                console.log(`✅ تم إرسال الرد ${responseType === 'ai' ? 'الذكي' : 'التلقائي'} إلى: ${originalMessage.key.remoteJid}`);
            }

        } catch (error) {
            console.error('خطأ في معالجة الرسالة بالذكاء الاصطناعي:', error);
            
            // Send error message
            try {
                await this.whatsappService.sendMessage(
                    originalMessage.key.remoteJid,
                    'عذراً، حدث خطأ في معالجة رسالتك. يرجى المحاولة مرة أخرى.'
                );
            } catch (sendError) {
                console.error('خطأ في إرسال رسالة الخطأ:', sendError);
            }
        }
    }

    generateFallbackResponse(messageText, businessData, propertiesData) {
        const message = messageText.toLowerCase();
        
        // Check for greetings
        if (message.includes('مرحبا') || message.includes('السلام') || message.includes('هلا') || message.includes('اهلا')) {
            return `أهلاً وسهلاً بك في ${businessData.name}! 🏠\n\nنحن مستشارون عقاريون متخصصون في الاستثمار العقاري داخل مصر 🇪🇬\n\n📍 الموقع: ${businessData.address}\n📞 للتواصل: ${businessData.phone}\n\nكيف يمكنني مساعدتك في رحلتك الاستثمارية؟`;
        }
        
        // Check for property inquiries
        if (message.includes('عقار') || message.includes('شقة') || message.includes('فيلا') || message.includes('سعر') || message.includes('استثمار')) {
            let response = `🏠 العقارات المتاحة لدينا:\n\n`;
            if (propertiesData.length > 0) {
                propertiesData.slice(0, 3).forEach((property, index) => {
                    response += `${index + 1}. ${property.title}\n`;
                    response += `   📍 الموقع: ${property.location.district}, ${property.location.city}\n`;
                    response += `   📐 المساحة: ${property.area} م²\n`;
                    response += `   💰 السعر: ${property.price?.toLocaleString()} ${property.currency}\n`;
                    response += `   🏠 النوع: ${property.type}\n\n`;
                });
                if (propertiesData.length > 3) {
                    response += `وعقارات أخرى متنوعة...\n\n`;
                }
            } else {
                response += `لدينا مجموعة متنوعة من العقارات الاستثمارية\n\n`;
            }
            response += `💡 للحصول على تفاصيل أكثر وتحليل استثماري مفصل، دعنا نرتب مكالمة سريعة!\n\nمتى يناسبك نتكلم؟`;
            return response;
        }

        // Check for appointment requests
        if (message.includes('موعد') || message.includes('مكالمة') || message.includes('لقاء') || message.includes('ميتنج')) {
            return `📅 ممتاز! سأكون سعيداً بترتيب موعد معك\n\nيرجى إرسال:\n• اسمك الكريم\n• رقم هاتفك\n• الوقت المفضل للمكالمة\n• نوع العقار المهتم به (إن وجد)\n\nوسأتواصل معك في أقرب وقت لتحديد موعد مناسب 📞`;
        }

        // Check for investment inquiries
        if (message.includes('استثمار') || message.includes('عائد') || message.includes('ربح') || message.includes('تضخم')) {
            return `💡 الاستثمار العقاري في مصر فرصة ذهبية!\n\n🔹 حماية من التضخم\n🔹 عائد استثماري مجزي\n🔹 زيادة قيمة رأس المال\n🔹 دخل شهري ثابت (حسب نوع العقار)\n\nالتفاصيل الاستثمارية تحتاج شرح مفصل...\n\nخلينا نعمل مكالمة 10 دقائق نوضح لك الصورة كاملة؟\n\nإمتى الوقت المناسب؟`;
        }
        
        // Check for business info
        if (message.includes('ساعات') || message.includes('موقع') || message.includes('عنوان') || message.includes('مكتب')) {
            const workingHours = Object.entries(businessData.workingHours || {})
                .map(([day, hours]) => `${day}: ${hours}`)
                .join('\n');
            
            return `📍 معلومات المكتب:\n\n🏢 ${businessData.name}\n📍 العنوان: ${businessData.address}\n📞 الهاتف: ${businessData.phone}\n📧 البريد: ${businessData.email}\n\n⏰ ساعات العمل:\n${workingHours}\n\n💳 طرق الدفع المتاحة:\n${businessData.paymentMethods?.join('\n• ') || 'متنوعة'}\n\nنحن في خدمتك دائماً! 🤝`;
        }
        
        // Check for contact info
        if (message.includes('تواصل') || message.includes('هاتف') || message.includes('ايميل') || message.includes('رقم')) {
            return `📞 للتواصل المباشر:\n\n📱 الهاتف: ${businessData.phone}\n📧 البريد الإلكتروني: ${businessData.email}\n📍 العنوان: ${businessData.address}\n\nأو تواصل معي هنا مباشرة وسأكون سعيداً بمساعدتك! 😊`;
        }

        // Check for payment methods
        if (message.includes('دفع') || message.includes('تقسيط') || message.includes('سداد')) {
            return `💳 طرق الدفع المتاحة:\n\n${businessData.paymentMethods?.map(method => `• ${method}`).join('\n') || '• نقداً\n• تحويل بنكي\n• تقسيط مريح'}\n\n📋 كل عقار له خطة سداد مرنة تناسب ظروفك المالية\n\nعشان نحدد الخطة المناسبة ليك، خلينا نتكلم في مكالمة سريعة؟`;
        }
        
        // Default response
        return `شكراً لتواصلك مع ${businessData.name}! 🏠\n\nأنا مستشارك العقاري وأقدر أساعدك في:\n\n🔹 اختيار العقار المناسب لاستثمارك\n🔹 تحليل العائد المتوقع\n🔹 خطط السداد المرنة\n🔹 المتابعة القانونية\n🔹 تقييم الفرص الاستثمارية\n\nالاستثمار العقاري قرار مهم يحتاج نقاش مفصل...\n\nخلينا نرتب مكالمة قصيرة نشرح فيها كل التفاصيل؟ 📞`;
    }

    initializeServices() {
        // Initialize Claude service if settings are available
        if (this.settings.aiEnabled && this.settings.claudeApiKey) {
            this.initializeClaude();
        }
    }

    initializeClaude() {
        try {
            this.claudeService = new ClaudeService(this.settings.claudeApiKey, this.settings.claudeModel);
            console.log('تم تهيئة خدمة Claude بنجاح');
        } catch (error) {
            console.error('خطأ في تهيئة Claude:', error);
            this.claudeService = null;
        }
    }

    start() {
        this.server.listen(this.port, '0.0.0.0', () => {
            console.log(`🚀 الخادم يعمل على المنفذ ${this.port}`);
            console.log(`🌐 الرابط: http://localhost:${this.port}`);
            console.log(`📱 WhatsApp Bot جاهز للاستخدام`);
        });
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 إيقاف الخادم...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 إيقاف الخادم...');
    process.exit(0);
});

// Start the server
const server = new WhatsAppBotServer();
server.start();