const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
    constructor(apiKey = null, model = null) {
        // Fixed API key and model - override any passed parameters
        this.apiKey = 'AIzaSyDgrOhQyC_SdbjMoB5AESrdbPsPChKjfDI';
        this.modelName = 'gemini-2.5-flash';
        
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.model = null;
        this.conversationHistory = new Map(); // Store conversation history per user
        this.maxHistoryLength = 10; // Maximum number of messages to keep in history
        
        this.initialize();
    }

    initialize() {
        try {
            this.model = this.genAI.getGenerativeModel({ model: this.modelName });
            console.log(`✅ تم تهيئة Gemini ${this.modelName} بنجاح`);
        } catch (error) {
            console.error('❌ خطأ في تهيئة Gemini:', error);
            throw error;
        }
    }

    async generateResponse(userMessage, systemPrompt = '', userId = 'default', businessData = null, productsData = null) {
        try {
            if (!this.model) {
                throw new Error('نموذج Gemini غير مهيأ');
            }

            // Get or create conversation history for this user
            if (!this.conversationHistory.has(userId)) {
                this.conversationHistory.set(userId, []);
            }
            
            const history = this.conversationHistory.get(userId);
            
            // Build the conversation context
            let conversationContext = '';
            if (systemPrompt) {
                conversationContext += `التعليمات: ${systemPrompt}\n\n`;
            }
            
            // Add business information if available
            if (businessData) {
                conversationContext += `معلومات البزنس:\n`;
                conversationContext += `اسم البزنس: ${businessData.name}\n`;
                conversationContext += `الوصف: ${businessData.description}\n`;
                conversationContext += `رقم الهاتف: ${businessData.phone}\n`;
                conversationContext += `البريد الإلكتروني: ${businessData.email}\n`;
                conversationContext += `العنوان: ${businessData.address}\n`;
                
                if (businessData.workingHours) {
                    conversationContext += `ساعات العمل:\n`;
                    Object.entries(businessData.workingHours).forEach(([day, hours]) => {
                        const dayNames = {
                            sunday: 'الأحد',
                            monday: 'الاثنين',
                            tuesday: 'الثلاثاء',
                            wednesday: 'الأربعاء',
                            thursday: 'الخميس',
                            friday: 'الجمعة',
                            saturday: 'السبت'
                        };
                        conversationContext += `${dayNames[day]}: ${hours}\n`;
                    });
                }
                
                if (businessData.paymentMethods && businessData.paymentMethods.length > 0) {
                    conversationContext += `طرق الدفع المتاحة: ${businessData.paymentMethods.join(', ')}\n`;
                }
                
                if (businessData.deliveryInfo) {
                    conversationContext += `معلومات التوصيل:\n`;
                    conversationContext += `رسوم التوصيل: ${businessData.deliveryInfo.deliveryFee} ريال\n`;
                    conversationContext += `الحد الأدنى للتوصيل المجاني: ${businessData.deliveryInfo.freeDeliveryMinimum} ريال\n`;
                    conversationContext += `مدة التوصيل: ${businessData.deliveryInfo.deliveryTime}\n`;
                    if (businessData.deliveryInfo.deliveryAreas) {
                        conversationContext += `مناطق التوصيل: ${businessData.deliveryInfo.deliveryAreas.join(', ')}\n`;
                    }
                }
                
                if (businessData.returnPolicy) {
                    conversationContext += `سياسة الإرجاع: ${businessData.returnPolicy}\n`;
                }
                
                if (businessData.warranty) {
                    conversationContext += `الضمان: ${businessData.warranty}\n`;
                }
                
                conversationContext += '\n';
            }
            
            // Add products information if available and relevant
            if (productsData && productsData.length > 0) {
                // Check if user is asking about products
                const productKeywords = ['منتج', 'منتجات', 'سعر', 'أسعار', 'متوفر', 'توفر', 'شراء', 'اشتري', 'كم', 'ايش', 'وش', 'عندكم', 'لديكم'];
                const isProductQuery = productKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
                
                if (isProductQuery) {
                    conversationContext += `المنتجات المتاحة:\n`;
                    productsData.slice(0, 10).forEach(product => { // Limit to first 10 products to avoid context overflow
                        conversationContext += `- ${product.name} (${product.brand})\n`;
                        conversationContext += `  الفئة: ${product.category}\n`;
                        conversationContext += `  السعر: ${product.price} ${product.currency}\n`;
                        if (product.originalPrice && product.originalPrice > product.price) {
                            const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
                            conversationContext += `  السعر الأصلي: ${product.originalPrice} ${product.currency} (خصم ${discount}%)\n`;
                        }
                        conversationContext += `  الحالة: ${product.inStock && product.quantity > 0 ? 'متوفر' : 'غير متوفر'}\n`;
                        if (product.inStock && product.quantity > 0) {
                            conversationContext += `  الكمية المتاحة: ${product.quantity}\n`;
                        }
                        conversationContext += `  الوصف: ${product.description}\n`;
                        if (product.features && product.features.length > 0) {
                            conversationContext += `  المميزات: ${product.features.slice(0, 3).join(', ')}\n`;
                        }
                        conversationContext += '\n';
                    });
                }
            }
            
            // Add conversation history
            if (history.length > 0) {
                conversationContext += 'السياق السابق للمحادثة:\n';
                history.forEach((msg, index) => {
                    conversationContext += `${msg.role}: ${msg.content}\n`;
                });
                conversationContext += '\n';
            }
            
            conversationContext += `المستخدم: ${userMessage}\nالمساعد:`;

            // Generate response
            const result = await this.model.generateContent(conversationContext);
            const response = result.response;
            const text = response.text();

            if (!text || text.trim() === '') {
                return 'عذراً، لم أتمكن من فهم سؤالك. يرجى إعادة صياغته.';
            }

            // Update conversation history
            this.updateConversationHistory(userId, userMessage, text);

            console.log(`🤖 تم إنشاء رد من Gemini للمستخدم ${userId}`);
            return text.trim();

        } catch (error) {
            console.error('❌ خطأ في إنشاء الرد من Gemini:', error);
            
            // Handle specific error types
            if (error.message.includes('API_KEY_INVALID')) {
                return 'خطأ: مفتاح API غير صحيح. يرجى التحقق من الإعدادات.';
            } else if (error.message.includes('QUOTA_EXCEEDED')) {
                return 'عذراً، تم تجاوز الحد المسموح من الاستخدام. يرجى المحاولة لاحقاً.';
            } else if (error.message.includes('SAFETY')) {
                return 'عذراً، لا يمكنني الإجابة على هذا السؤال لأسباب تتعلق بالسلامة.';
            } else {
                return 'عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى.';
            }
        }
    }

    updateConversationHistory(userId, userMessage, aiResponse) {
        const history = this.conversationHistory.get(userId);
        
        // Add user message and AI response
        history.push({ role: 'المستخدم', content: userMessage });
        history.push({ role: 'المساعد', content: aiResponse });
        
        // Keep only the last N messages to prevent context from getting too long
        if (history.length > this.maxHistoryLength * 2) {
            history.splice(0, history.length - this.maxHistoryLength * 2);
        }
        
        this.conversationHistory.set(userId, history);
    }

    clearConversationHistory(userId = null) {
        if (userId) {
            this.conversationHistory.delete(userId);
            console.log(`🗑️ تم مسح تاريخ المحادثة للمستخدم ${userId}`);
        } else {
            this.conversationHistory.clear();
            console.log('🗑️ تم مسح جميع تواريخ المحادثات');
        }
    }

    getConversationHistory(userId) {
        return this.conversationHistory.get(userId) || [];
    }

    // Generate response with image (for gemini-2.5-flash)
    async generateResponseWithImage(userMessage, imageBuffer, systemPrompt = '', userId = 'default') {
        try {
            if (this.modelName !== 'gemini-2.5-flash') {
                throw new Error('هذه الميزة متاحة فقط مع نموذج gemini-2.5-flash');
            }

            if (!this.model) {
                throw new Error('نموذج Gemini غير مهيأ');
            }

            // Convert image buffer to base64
            const imageBase64 = imageBuffer.toString('base64');
            
            // Build prompt with system instructions
            let fullPrompt = systemPrompt ? `${systemPrompt}\n\n${userMessage}` : userMessage;

            const imagePart = {
                inlineData: {
                    data: imageBase64,
                    mimeType: 'image/jpeg' // Adjust based on actual image type
                }
            };

            const result = await this.model.generateContent([fullPrompt, imagePart]);
            const response = result.response;
            const text = response.text();

            if (!text || text.trim() === '') {
                return 'عذراً، لم أتمكن من تحليل الصورة. يرجى المحاولة مرة أخرى.';
            }

            console.log(`🖼️ تم تحليل الصورة وإنشاء رد من Gemini للمستخدم ${userId}`);
            return text.trim();

        } catch (error) {
            console.error('❌ خطأ في تحليل الصورة مع Gemini:', error);
            return 'عذراً، حدث خطأ في تحليل الصورة. يرجى المحاولة مرة أخرى.';
        }
    }

    // Check if the service is properly configured
    isConfigured() {
        return !!(this.apiKey && this.model);
    }

    // Get service status
    getStatus() {
        return {
            configured: this.isConfigured(),
            model: this.modelName,
            activeConversations: this.conversationHistory.size
        };
    }

    // Update API key and reinitialize
    updateApiKey(newApiKey) {
        this.apiKey = newApiKey;
        this.genAI = new GoogleGenerativeAI(newApiKey);
        this.initialize();
    }

    // Update model and reinitialize
    updateModel(newModel) {
        this.modelName = newModel;
        this.initialize();
    }

    // Validate message before processing
    validateMessage(message) {
        if (!message || typeof message !== 'string') {
            return false;
        }
        
        // Check message length (Gemini has input limits)
        if (message.length > 30000) {
            return false;
        }
        
        // Check for empty or whitespace-only messages
        if (message.trim().length === 0) {
            return false;
        }
        
        return true;
    }

    // Get conversation statistics
    getConversationStats(userId) {
        const history = this.conversationHistory.get(userId) || [];
        const userMessages = history.filter(msg => msg.role === 'المستخدم').length;
        const aiMessages = history.filter(msg => msg.role === 'المساعد').length;
        
        return {
            totalMessages: history.length,
            userMessages,
            aiMessages,
            lastActivity: history.length > 0 ? new Date() : null
        };
    }
}

module.exports = GeminiService;