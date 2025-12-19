const XLSX = require('xlsx');
const fs = require('fs-extra');
const path = require('path');

class ExcelManager {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.messagesFile = path.join(this.dataDir, 'whatsapp_messages.xlsx');
        this.meetingsFile = path.join(this.dataDir, 'meeting_requests.xlsx');
        this.salesContactsFile = path.join(this.dataDir, 'sales_contacts.xlsx');
        
        this.ensureDataDirectory();
        this.initializeFiles();
    }

    async ensureDataDirectory() {
        await fs.ensureDir(this.dataDir);
    }

    initializeFiles() {
        // Initialize messages file if it doesn't exist
        if (!fs.existsSync(this.messagesFile)) {
            this.createMessagesFile();
        }

        // Initialize meetings file if it doesn't exist
        if (!fs.existsSync(this.meetingsFile)) {
            this.createMeetingsFile();
        }

        // Initialize sales contacts file if it doesn't exist
        if (!fs.existsSync(this.salesContactsFile)) {
            this.createSalesContactsFile();
        }
    }

    createMessagesFile() {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([
            ['التاريخ والوقت', 'رقم الهاتف', 'اسم المرسل', 'الرسالة', 'نوع الرسالة', 'حالة الرد']
        ]);
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'رسائل الواتساب');
        XLSX.writeFile(workbook, this.messagesFile);
        console.log('✅ تم إنشاء ملف رسائل الواتساب');
    }

    createMeetingsFile() {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([
            ['التاريخ والوقت', 'رقم الهاتف', 'اسم العميل', 'نوع الطلب', 'تفاصيل الطلب', 'الحالة', 'ملاحظات']
        ]);
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'طلبات الاجتماعات');
        XLSX.writeFile(workbook, this.meetingsFile);
        console.log('✅ تم إنشاء ملف طلبات الاجتماعات');
    }

    createSalesContactsFile() {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([
            ['التاريخ والوقت', 'رقم الهاتف', 'اسم العميل', 'نوع الاستفسار', 'تفاصيل الطلب', 'حالة المتابعة', 'ملاحظات']
        ]);
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'طلبات التواصل مع المبيعات');
        XLSX.writeFile(workbook, this.salesContactsFile);
        console.log('✅ تم إنشاء ملف طلبات التواصل مع المبيعات');
    }

    async saveWhatsAppMessage(phoneNumber, senderName, message, messageType = 'نص', replyStatus = 'تم الرد') {
        try {
            const workbook = XLSX.readFile(this.messagesFile);
            const worksheet = workbook.Sheets['رسائل الواتساب'];
            
            // Get existing data
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Add new row
            const newRow = [
                new Date().toLocaleString('ar-EG'),
                phoneNumber,
                senderName || 'غير محدد',
                message,
                messageType,
                replyStatus
            ];
            
            data.push(newRow);
            
            // Create new worksheet with updated data
            const newWorksheet = XLSX.utils.aoa_to_sheet(data);
            workbook.Sheets['رسائل الواتساب'] = newWorksheet;
            
            // Save file
            XLSX.writeFile(workbook, this.messagesFile);
            console.log('✅ تم حفظ رسالة الواتساب في Excel');
            
            return true;
        } catch (error) {
            console.error('❌ خطأ في حفظ رسالة الواتساب:', error);
            return false;
        }
    }

    async saveMeetingRequest(phoneNumber, clientName, requestType, requestDetails, status = 'جديد', notes = '') {
        try {
            const workbook = XLSX.readFile(this.meetingsFile);
            const worksheet = workbook.Sheets['طلبات الاجتماعات'];
            
            // Get existing data
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Add new row
            const newRow = [
                new Date().toLocaleString('ar-EG'),
                phoneNumber,
                clientName || 'غير محدد',
                requestType,
                requestDetails,
                status,
                notes
            ];
            
            data.push(newRow);
            
            // Create new worksheet with updated data
            const newWorksheet = XLSX.utils.aoa_to_sheet(data);
            workbook.Sheets['طلبات الاجتماعات'] = newWorksheet;
            
            // Save file
            XLSX.writeFile(workbook, this.meetingsFile);
            console.log('✅ تم حفظ طلب الاجتماع في Excel');
            
            return true;
        } catch (error) {
            console.error('❌ خطأ في حفظ طلب الاجتماع:', error);
            return false;
        }
    }

    async saveSalesContact(phoneNumber, clientName, inquiryType, requestDetails, followUpStatus = 'جديد', notes = '') {
        try {
            const workbook = XLSX.readFile(this.salesContactsFile);
            const worksheet = workbook.Sheets['طلبات التواصل مع المبيعات'];
            
            // Get existing data
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Add new row
            const newRow = [
                new Date().toLocaleString('ar-EG'),
                phoneNumber,
                clientName || 'غير محدد',
                inquiryType,
                requestDetails,
                followUpStatus,
                notes
            ];
            
            data.push(newRow);
            
            // Create new worksheet with updated data
            const newWorksheet = XLSX.utils.aoa_to_sheet(data);
            workbook.Sheets['طلبات التواصل مع المبيعات'] = newWorksheet;
            
            // Save file
            XLSX.writeFile(workbook, this.salesContactsFile);
            console.log('✅ تم حفظ طلب التواصل مع المبيعات في Excel');
            
            return true;
        } catch (error) {
            console.error('❌ خطأ في حفظ طلب التواصل مع المبيعات:', error);
            return false;
        }
    }

    getMessagesFilePath() {
        return this.messagesFile;
    }

    getMeetingsFilePath() {
        return this.meetingsFile;
    }

    getSalesContactsFilePath() {
        return this.salesContactsFile;
    }

    // Get statistics from Excel files
    async getMessagesStats() {
        try {
            if (!fs.existsSync(this.messagesFile)) {
                return { total: 0, today: 0, thisWeek: 0 };
            }

            const workbook = XLSX.readFile(this.messagesFile);
            const worksheet = workbook.Sheets['رسائل الواتساب'];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            const today = new Date();
            const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
            
            let todayCount = 0;
            let weekCount = 0;
            
            // Skip header row
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (row[0]) { // Check if date exists
                    const messageDate = new Date(row[0]);
                    if (messageDate.toDateString() === today.toDateString()) {
                        todayCount++;
                    }
                    if (messageDate >= startOfWeek) {
                        weekCount++;
                    }
                }
            }
            
            return {
                total: data.length - 1, // Subtract header row
                today: todayCount,
                thisWeek: weekCount
            };
        } catch (error) {
            console.error('❌ خطأ في قراءة إحصائيات الرسائل:', error);
            return { total: 0, today: 0, thisWeek: 0 };
        }
    }

    async getMeetingsStats() {
        try {
            if (!fs.existsSync(this.meetingsFile)) {
                return { total: 0, pending: 0, completed: 0 };
            }

            const workbook = XLSX.readFile(this.meetingsFile);
            const worksheet = workbook.Sheets['طلبات الاجتماعات'];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            let pendingCount = 0;
            let completedCount = 0;
            
            // Skip header row
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (row[5]) { // Status column
                    const status = row[5].toString().toLowerCase();
                    if (status.includes('جديد') || status.includes('معلق')) {
                        pendingCount++;
                    } else if (status.includes('مكتمل') || status.includes('تم')) {
                        completedCount++;
                    }
                }
            }
            
            return {
                total: data.length - 1, // Subtract header row
                pending: pendingCount,
                completed: completedCount
            };
        } catch (error) {
            console.error('❌ خطأ في قراءة إحصائيات الاجتماعات:', error);
            return { total: 0, pending: 0, completed: 0 };
        }
    }

    // Check if message contains meeting request keywords
    isMeetingRequest(message) {
        const meetingKeywords = [
            'ميتنج', 'اجتماع', 'لقاء', 'موعد', 'مقابلة', 'استشارة',
            'أريد أتكلم', 'عاوز أتكلم', 'محتاج أتكلم', 'ممكن نتكلم',
            'مكالمة', 'اتصال', 'زيارة', 'أريد أقابل', 'عاوز أقابل'
        ];
        
        const lowerMessage = message.toLowerCase();
        return meetingKeywords.some(keyword => lowerMessage.includes(keyword));
    }

    // Check if message contains sales contact request keywords
    isSalesContactRequest(message) {
        const salesKeywords = [
            'مبيعات', 'sales', 'بيع', 'شراء', 'أريد أشتري', 'عاوز أشتري',
            'استفسار', 'سؤال', 'معلومات', 'تفاصيل', 'أسعار', 'عروض',
            'تواصل', 'اتصل بي', 'كلمني', 'رد عليا', 'محتاج مساعدة'
        ];
        
        const lowerMessage = message.toLowerCase();
        return salesKeywords.some(keyword => lowerMessage.includes(keyword));
    }

    // Auto-categorize and save message
    async autoSaveMessage(phoneNumber, senderName, message) {
        try {
            // Always save to messages file
            await this.saveWhatsAppMessage(phoneNumber, senderName, message);

            // Check if it's a meeting request
            if (this.isMeetingRequest(message)) {
                await this.saveMeetingRequest(
                    phoneNumber,
                    senderName,
                    'طلب اجتماع من الواتساب',
                    message,
                    'جديد',
                    'تم الحفظ تلقائياً من رسالة الواتساب'
                );
            }

            // Check if it's a sales contact request
            if (this.isSalesContactRequest(message)) {
                await this.saveSalesContact(
                    phoneNumber,
                    senderName,
                    'استفسار من الواتساب',
                    message,
                    'جديد',
                    'تم الحفظ تلقائياً من رسالة الواتساب'
                );
            }

            return true;
        } catch (error) {
            console.error('❌ خطأ في الحفظ التلقائي للرسالة:', error);
            return false;
        }
    }
}

module.exports = ExcelManager;