const Anthropic = require('@anthropic-ai/sdk');

class ClaudeService {
    constructor(apiKey = null, model = null) {
        // Claude API configuration
        this.apiKey = apiKey || process.env.CLAUDE_API_KEY || 'sk-ant-api03-your-api-key-here';
        this.modelName = model || process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
        
        this.anthropic = new Anthropic({
            apiKey: this.apiKey,
        });
        
        this.conversationHistory = new Map(); // Store conversation history per user
        this.maxHistoryLength = 10; // Maximum number of messages to keep in history
        
        console.log(`✅ تم تهيئة Claude ${this.modelName} بنجاح`);
    }

    async generateResponse(userMessage, systemPrompt = '', userId = 'default', businessData = null, productsData = null) {
        try {
            if (!this.anthropic) {
                throw new Error('نموذج Claude غير مهيأ');
            }

            // Get or create conversation history for this user
            if (!this.conversationHistory.has(userId)) {
                this.conversationHistory.set(userId, []);
            }
            
            const history = this.conversationHistory.get(userId);
            
            // Build the system message with business context
            let systemMessage = systemPrompt || '';
            
            // Add business information if available
            if (businessData) {
                systemMessage += `\n\nمعلومات البزنس:\n`;
                systemMessage += `اسم البزنس: ${businessData.name}\n`;
                systemMessage += `الوصف: ${businessData.description}\n`;
                systemMessage += `رقم الهاتف: ${businessData.phone}\n`;
                systemMessage += `البريد الإلكتروني: ${businessData.email}\n`;
                systemMessage += `العنوان: ${businessData.address}\n`;
                
                if (businessData.workingHours) {
                    systemMessage += `ساعات العمل:\n`;
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
                        systemMessage += `${dayNames[day]}: ${hours}\n`;
                    });
                }
                
                if (businessData.paymentMethods && businessData.paymentMethods.length > 0) {
                    systemMessage += `طرق الدفع المتاحة: ${businessData.paymentMethods.join(', ')}\n`;
                }
            }
            
            // Add products information if available and relevant
            if (productsData && productsData.length > 0) {
                // Check if user is asking about products
                const productKeywords = ['منتج', 'منتجات', 'سعر', 'أسعار', 'متوفر', 'توفر', 'شراء', 'اشتري', 'كم', 'ايش', 'وش', 'عندكم', 'لديكم', 'عقار', 'عقارات'];
                const isProductQuery = productKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
                
                if (isProductQuery) {
                    systemMessage += `\n\nالعقارات المتاحة:\n`;
                    productsData.slice(0, 10).forEach(product => { // Limit to first 10 products to avoid context overflow
                        systemMessage += `- ${product.name}\n`;
                        systemMessage += `  النوع: ${product.type}\n`;
                        systemMessage += `  السعر: ${product.price} ${product.currency || 'جنيه'}\n`;
                        systemMessage += `  الحالة: ${product.status}\n`;
                        systemMessage += `  الموقع: ${product.location?.city}, ${product.location?.district}\n`;
                        systemMessage += `  الوصف: ${product.description}\n\n`;
                    });
                }
            }

            // Build messages array for Claude
            const messages = [];
            
            // Add conversation history
            history.forEach(msg => {
                messages.push({
                    role: msg.role === 'المستخدم' ? 'user' : 'assistant',
                    content: msg.content
                });
            });
            
            // Add current user message
            messages.push({
                role: 'user',
                content: userMessage
            });

            // Generate response using Claude
            const response = await this.anthropic.messages.create({
                model: this.modelName,
                max_tokens: 1000,
                system: systemMessage,
                messages: messages
            });

            const text = response.content[0].text;

            if (!text || text.trim() === '') {
                return 'عذراً، لم أتمكن من فهم سؤالك. يرجى إعادة صياغته.';
            }

            // Update conversation history
            this.updateConversationHistory(userId, userMessage, text);

            console.log(`🤖 تم إنشاء رد من Claude للمستخدم ${userId}`);
            return text.trim();

        } catch (error) {
            console.error('❌ خطأ في إنشاء الرد من Claude:', error);
            
            // Handle specific error types
            if (error.message.includes('authentication')) {
                return 'خطأ: مفتاح API غير صحيح. يرجى التحقق من الإعدادات.';
            } else if (error.message.includes('rate_limit')) {
                return 'عذراً، تم تجاوز الحد المسموح من الاستخدام. يرجى المحاولة لاحقاً.';
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

    // Check if the service is properly configured
    isConfigured() {
        return !!(this.apiKey && this.anthropic);
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
        this.anthropic = new Anthropic({
            apiKey: newApiKey,
        });
    }

    // Update model
    updateModel(newModel) {
        this.modelName = newModel;
    }

    // Validate message before processing
    validateMessage(message) {
        if (!message || typeof message !== 'string') {
            return false;
        }
        
        // Check message length (Claude has input limits)
        if (message.length > 100000) {
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

module.exports = ClaudeService;