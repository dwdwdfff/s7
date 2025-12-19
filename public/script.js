class RealEstateBot {
    constructor() {
        this.socket = io();
        this.isConnected = false;
        this.logs = [];
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.setupSocketListeners();
    }

    initializeElements() {
        // Status elements
        this.connectionStatus = document.getElementById('connectionStatus');
        this.statusText = document.getElementById('statusText');
        this.connectionInfo = document.getElementById('connectionInfo');
        this.phoneNumber = document.getElementById('phoneNumber');

        // Tab elements
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');

        // QR elements
        this.qrContainer = document.getElementById('qrContainer');
        this.generateQRBtn = document.getElementById('generateQR');
        this.disconnectBtn = document.getElementById('disconnect');
        this.phoneNumberInput = document.getElementById('phoneNumberInput');
        this.clearPhoneBtn = document.getElementById('clearPhone');

        // Business elements
        this.businessForm = document.getElementById('businessForm');

        // Properties elements
        this.addPropertyBtn = document.getElementById('addPropertyBtn');
        this.propertySearch = document.getElementById('propertySearch');
        this.searchPropertiesBtn = document.getElementById('searchPropertiesBtn');
        this.typeFilter = document.getElementById('typeFilter');
        this.cityFilter = document.getElementById('cityFilter');
        this.statusFilter = document.getElementById('statusFilter');
        this.propertiesContainer = document.getElementById('propertiesContainer');
        this.propertiesStats = document.getElementById('propertiesStats');

        // Appointments elements
        this.appointmentsContainer = document.getElementById('appointmentsContainer');
        this.inquiriesContainer = document.getElementById('inquiriesContainer');
        this.refreshAppointments = document.getElementById('refreshAppointments');
        this.appointmentStatusFilter = document.getElementById('appointmentStatusFilter');
        this.appointmentDateFilter = document.getElementById('appointmentDateFilter');

        // Modal elements
        this.propertyModal = document.getElementById('propertyModal');
        this.propertyForm = document.getElementById('propertyForm');
        this.closePropertyModal = document.getElementById('closePropertyModal');
        this.cancelProperty = document.getElementById('cancelProperty');
        this.propertyModalTitle = document.getElementById('propertyModalTitle');

        // Settings elements
        this.aiSettingsForm = document.getElementById('aiSettingsForm');
        this.aiEnabled = document.getElementById('aiEnabled');
        this.aiSettings = document.getElementById('aiSettings');
        this.geminiApiKey = document.getElementById('geminiApiKey');
        this.aiPrompt = document.getElementById('aiPrompt');
        this.toggleApiKey = document.getElementById('toggleApiKey');

        // Logs elements
        this.logsContainer = document.getElementById('logsContainer');
        this.clearLogsBtn = document.getElementById('clearLogs');
        this.exportLogsBtn = document.getElementById('exportLogs');

        // Reports elements
        this.totalMessages = document.getElementById('totalMessages');
        this.totalMeetings = document.getElementById('totalMeetings');
        this.todayMessages = document.getElementById('todayMessages');
        this.pendingMeetings = document.getElementById('pendingMeetings');
        this.downloadMessages = document.getElementById('downloadMessages');
        this.downloadMeetings = document.getElementById('downloadMeetings');
        this.downloadSales = document.getElementById('downloadSales');

        // Admin elements
        this.adminUsername = document.getElementById('adminUsername');
        this.adminPassword = document.getElementById('adminPassword');
        this.adminLoginBtn = document.getElementById('adminLoginBtn');
        this.adminLogin = document.getElementById('adminLogin');
        this.adminPanel = document.getElementById('adminPanel');
        this.adminLogout = document.getElementById('adminLogout');
    }

    bindEvents() {
        // Tab switching
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // QR Code events
        if (this.generateQRBtn) {
            this.generateQRBtn.addEventListener('click', () => this.generateQR());
        }
        if (this.disconnectBtn) {
            this.disconnectBtn.addEventListener('click', () => this.disconnect());
        }
        if (this.clearPhoneBtn) {
            this.clearPhoneBtn.addEventListener('click', () => this.clearPhoneNumber());
        }

        // Business form
        if (this.businessForm) {
            this.businessForm.addEventListener('submit', (e) => this.saveBusiness(e));
        }

        // Properties events
        if (this.addPropertyBtn) {
            this.addPropertyBtn.addEventListener('click', () => this.openPropertyModal());
        }
        if (this.propertySearch) {
            this.propertySearch.addEventListener('input', () => this.searchProperties());
        }
        if (this.searchPropertiesBtn) {
            this.searchPropertiesBtn.addEventListener('click', () => this.searchProperties());
        }
        if (this.typeFilter) {
            this.typeFilter.addEventListener('change', () => this.filterProperties());
        }
        if (this.cityFilter) {
            this.cityFilter.addEventListener('change', () => this.filterProperties());
        }
        if (this.statusFilter) {
            this.statusFilter.addEventListener('change', () => this.filterProperties());
        }

        // Property modal events
        if (this.propertyForm) {
            this.propertyForm.addEventListener('submit', (e) => this.saveProperty(e));
        }
        if (this.closePropertyModal) {
            this.closePropertyModal.addEventListener('click', () => this.closeModal());
        }
        if (this.cancelProperty) {
            this.cancelProperty.addEventListener('click', () => this.closeModal());
        }
        if (this.propertyModal) {
            this.propertyModal.addEventListener('click', (e) => {
                if (e.target === this.propertyModal) this.closeModal();
            });
        }

        // Appointments events
        if (this.refreshAppointments) {
            this.refreshAppointments.addEventListener('click', () => this.loadAppointments());
        }
        if (this.appointmentStatusFilter) {
            this.appointmentStatusFilter.addEventListener('change', () => this.filterAppointments());
        }
        if (this.appointmentDateFilter) {
            this.appointmentDateFilter.addEventListener('change', () => this.filterAppointments());
        }

        // Settings events
        if (this.aiSettingsForm) {
            this.aiSettingsForm.addEventListener('submit', (e) => this.saveAISettings(e));
        }
        if (this.aiEnabled) {
            this.aiEnabled.addEventListener('change', () => this.toggleAISettings());
        }
        if (this.toggleApiKey) {
            this.toggleApiKey.addEventListener('click', () => this.toggleApiKeyVisibility());
        }

        // Logs events
        if (this.clearLogsBtn) {
            this.clearLogsBtn.addEventListener('click', () => this.clearLogs());
        }
        if (this.exportLogsBtn) {
            this.exportLogsBtn.addEventListener('click', () => this.exportLogs());
        }

        // Reports events
        if (this.downloadMessages) {
            this.downloadMessages.addEventListener('click', () => this.downloadExcelFile('messages'));
        }
        if (this.downloadMeetings) {
            this.downloadMeetings.addEventListener('click', () => this.downloadExcelFile('meetings'));
        }
        if (this.downloadSales) {
            this.downloadSales.addEventListener('click', () => this.downloadExcelFile('sales'));
        }

        // Admin events
        if (this.adminLoginBtn) {
            this.adminLoginBtn.addEventListener('click', () => this.performAdminLogin());
        }
        if (this.adminLogout) {
            this.adminLogout.addEventListener('click', () => this.performAdminLogout());
        }
        if (this.adminPassword) {
            this.adminPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performAdminLogin();
                }
            });
        }

        // Auto-calculate price per meter
        const propertyArea = document.getElementById('propertyArea');
        const propertyPrice = document.getElementById('propertyPrice');
        const propertyPricePerMeter = document.getElementById('propertyPricePerMeter');
        
        if (propertyArea && propertyPrice && propertyPricePerMeter) {
            const calculatePricePerMeter = () => {
                const area = parseFloat(propertyArea.value);
                const price = parseFloat(propertyPrice.value);
                if (area && price) {
                    propertyPricePerMeter.value = Math.round(price / area);
                }
            };
            
            propertyArea.addEventListener('input', calculatePricePerMeter);
            propertyPrice.addEventListener('input', calculatePricePerMeter);
        }

        // Load saved phone number
        this.loadSavedPhoneNumber();
        
        // Check connection status
        this.checkConnectionStatus();
    }

    loadSavedPhoneNumber() {
        const savedPhone = localStorage.getItem('whatsapp_phone');
        if (savedPhone && this.phoneNumberInput) {
            this.phoneNumberInput.value = savedPhone;
        }
    }

    checkConnectionStatus() {
        const isConnected = localStorage.getItem('whatsapp_connected') === 'true';
        const connectedTime = localStorage.getItem('whatsapp_connected_time');
        
        if (isConnected && connectedTime) {
            const timeDiff = Date.now() - new Date(connectedTime).getTime();
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            // If connected more than 24 hours ago, consider it disconnected
            if (hoursDiff > 24) {
                localStorage.removeItem('whatsapp_connected');
                localStorage.removeItem('whatsapp_connected_time');
                return;
            }
            
            // Show last connection info
            if (this.qrContainer) {
                this.qrContainer.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: #ffc107;">
                        <i class="fas fa-clock" style="font-size: 2.5rem; margin-bottom: 15px;"></i>
                        <h4>⏰ آخر اتصال</h4>
                        <p style="color: #666; margin-top: 10px;">متصل منذ ${this.formatTimeAgo(connectedTime)}</p>
                        <button onclick="app.generateQR()" class="btn btn-primary" style="margin-top: 15px;">
                            <i class="fas fa-sync-alt"></i> إعادة الاتصال
                        </button>
                    </div>
                `;
            }
        }
    }

    formatTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        if (diffHours > 0) {
            return `${diffHours} ساعة`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes} دقيقة`;
        } else {
            return 'أقل من دقيقة';
        }
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        this.socket.on('qr', (qr) => {
            this.displayQR(qr);
        });

        this.socket.on('ready', (user) => {
            this.updateConnectionStatus(true, user);
        });

        this.socket.on('disconnected', () => {
            this.updateConnectionStatus(false);
        });

        this.socket.on('message', (data) => {
            this.addLog('message', data);
        });

        this.socket.on('error', (error) => {
            this.addLog('error', error);
            this.showToast('خطأ: ' + error, 'error');
            
            // Clear QR container on error
            if (this.qrContainer && error.includes('QR')) {
                this.qrContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #dc3545;">
                        <h4>❌ فشل في إنشاء رمز QR</h4>
                        <p>${error}</p>
                        <button onclick="app.generateQR()" class="btn btn-primary" style="margin-top: 10px;">إعادة المحاولة</button>
                    </div>
                `;
            }
        });

        this.socket.on('aiStatusChanged', (enabled) => {
            this.updateAIStatus(enabled);
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        this.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab contents
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });

        // Load data for specific tabs
        if (tabName === 'properties') {
            this.loadProperties();
        } else if (tabName === 'appointments') {
            this.loadAppointments();
            this.loadInquiries();
        } else if (tabName === 'business') {
            this.loadBusiness();
        }
    }

    generateQR() {
        const phoneNumber = this.phoneNumberInput ? this.phoneNumberInput.value.trim() : '';
        
        // Save phone number to localStorage if provided
        if (phoneNumber) {
            localStorage.setItem('whatsapp_phone', phoneNumber);
        }
        
        // Show loading in QR container
        if (this.qrContainer) {
            this.qrContainer.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                        <span class="sr-only">Loading...</span>
                    </div>
                    <h4 style="margin-top: 20px; color: #2c5aa0;">جاري إنشاء رمز QR...</h4>
                    <p style="color: #666;">قد يستغرق هذا بضع ثوانٍ</p>
                </div>
            `;
        }
        
        this.socket.emit('generateQR', { phoneNumber });
        this.showToast('جاري إنشاء رمز QR...', 'info');
    }

    disconnect() {
        this.socket.emit('disconnect');
        this.showToast('جاري قطع الاتصال...', 'info');
    }

    clearPhoneNumber() {
        if (this.phoneNumberInput) {
            this.phoneNumberInput.value = '';
        }
        // Remove from localStorage
        localStorage.removeItem('whatsapp_phone');
        this.socket.emit('clearPhone');
        this.showToast('تم مسح رقم الهاتف', 'success');
    }

    displayQR(qr) {
        if (this.qrContainer) {
            this.qrContainer.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h4 style="margin-bottom: 15px; color: #2c5aa0;">امسح الرمز بتطبيق الواتساب</h4>
                    <img src="${qr}" alt="QR Code" style="max-width: 300px; height: auto; border: 2px solid #2c5aa0; border-radius: 10px; padding: 10px; background: white;">
                    <p style="margin-top: 15px; color: #666; font-size: 14px;">افتح الواتساب > الإعدادات > الأجهزة المرتبطة > ربط جهاز</p>
                </div>
            `;
            this.showToast('تم إنشاء رمز QR بنجاح!', 'success');
        }
    }

    updateConnectionStatus(connected, user = null) {
        this.isConnected = connected;
        
        if (this.connectionStatus) {
            this.connectionStatus.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
        }
        
        if (this.statusText) {
            this.statusText.textContent = connected ? 'متصل' : 'غير متصل';
        }
        
        if (this.connectionInfo) {
            this.connectionInfo.textContent = connected ? 'متصل' : 'غير متصل';
        }
        
        if (this.phoneNumber && user) {
            // Format phone number for display
            let displayNumber = user.id || 'غير محدد';
            if (displayNumber.includes('@')) {
                displayNumber = displayNumber.split('@')[0].replace(':', '');
            }
            this.phoneNumber.textContent = displayNumber;
        }

        if (connected) {
            this.showToast('تم الاتصال بـ WhatsApp بنجاح!', 'success');
            if (this.qrContainer) {
                this.qrContainer.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: #28a745;">
                        <i class="fas fa-check-circle" style="font-size: 3rem; margin-bottom: 15px;"></i>
                        <h4>✅ متصل بنجاح</h4>
                        <p style="color: #666; margin-top: 10px;">يمكنك الآن استقبال الرسائل</p>
                        ${user ? `<p style="color: #666; font-size: 0.9rem;">الرقم: ${user.id ? user.id.split('@')[0].replace(':', '') : 'غير محدد'}</p>` : ''}
                    </div>
                `;
            }
            // Save connection state
            localStorage.setItem('whatsapp_connected', 'true');
            localStorage.setItem('whatsapp_connected_time', new Date().toISOString());
        } else {
            // Clear connection state
            localStorage.removeItem('whatsapp_connected');
            localStorage.removeItem('whatsapp_connected_time');
        }
    }

    async loadBusiness() {
        try {
            const response = await fetch('/api/business');
            const business = await response.json();
            
            if (business) {
                this.populateBusinessForm(business);
            }
        } catch (error) {
            console.error('Error loading business:', error);
            this.showToast('خطأ في تحميل بيانات الشركة', 'error');
        }
    }

    populateBusinessForm(business) {
        const fields = [
            'businessName', 'businessPhone', 'businessDescription', 
            'businessEmail', 'businessAddress', 'adminNumbers'
        ];
        
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element && business[field]) {
                element.value = business[field];
            }
        });

        // Handle arrays
        if (business.paymentMethods) {
            const checkboxes = document.querySelectorAll('#paymentMethods input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = business.paymentMethods.includes(cb.value);
            });
        }

        if (business.propertyTypes) {
            const checkboxes = document.querySelectorAll('#propertyTypes input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = business.propertyTypes.includes(cb.value);
            });
        }

        if (business.services) {
            const checkboxes = document.querySelectorAll('#services input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = business.services.includes(cb.value);
            });
        }

        // Handle working hours
        if (business.workingHours) {
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            days.forEach(day => {
                const element = document.getElementById(day + 'Hours');
                if (element && business.workingHours[day]) {
                    element.value = business.workingHours[day];
                }
            });
        }
    }

    async saveBusiness(e) {
        e.preventDefault();
        
        const formData = new FormData(this.businessForm);
        const business = {};
        
        // Get basic fields
        const fields = [
            'businessName', 'businessPhone', 'businessDescription', 
            'businessEmail', 'businessAddress', 'adminNumbers'
        ];
        
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                business[field] = element.value;
            }
        });

        // Get payment methods
        const paymentMethods = [];
        document.querySelectorAll('#paymentMethods input[type="checkbox"]:checked').forEach(cb => {
            paymentMethods.push(cb.value);
        });
        business.paymentMethods = paymentMethods;

        // Get property types
        const propertyTypes = [];
        document.querySelectorAll('#propertyTypes input[type="checkbox"]:checked').forEach(cb => {
            propertyTypes.push(cb.value);
        });
        business.propertyTypes = propertyTypes;

        // Get services
        const services = [];
        document.querySelectorAll('#services input[type="checkbox"]:checked').forEach(cb => {
            services.push(cb.value);
        });
        business.services = services;

        // Get working hours
        const workingHours = {};
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        days.forEach(day => {
            const element = document.getElementById(day + 'Hours');
            if (element) {
                workingHours[day] = element.value;
            }
        });
        business.workingHours = workingHours;

        try {
            const response = await fetch('/api/business', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(business)
            });

            if (response.ok) {
                this.showToast('تم حفظ بيانات الشركة بنجاح', 'success');
            } else {
                throw new Error('فشل في حفظ البيانات');
            }
        } catch (error) {
            console.error('Error saving business:', error);
            this.showToast('خطأ في حفظ بيانات الشركة', 'error');
        }
    }

    async loadProperties() {
        try {
            const response = await fetch('/api/properties');
            const properties = await response.json();
            
            this.displayProperties(properties);
            this.updatePropertiesStats(properties);
        } catch (error) {
            console.error('Error loading properties:', error);
            this.showToast('خطأ في تحميل العقارات', 'error');
        }
    }

    displayProperties(properties) {
        if (!this.propertiesContainer) return;

        if (!properties || properties.length === 0) {
            this.propertiesContainer.innerHTML = `
                <div class="properties-placeholder">
                    <i class="fas fa-home"></i>
                    <p>لا توجد عقارات بعد</p>
                    <button class="btn btn-primary" onclick="document.getElementById('addPropertyBtn').click()">
                        <i class="fas fa-plus"></i>
                        إضافة أول عقار
                    </button>
                </div>
            `;
            return;
        }

        const propertiesHTML = properties.map(property => this.createPropertyCard(property)).join('');
        this.propertiesContainer.innerHTML = propertiesHTML;
    }

    createPropertyCard(property) {
        const statusClass = property.status === 'متاح' ? 'available' : 
                           property.status === 'محجوز' ? 'reserved' : 'sold';
        
        const features = property.features ? property.features.slice(0, 3) : [];
        const featuresHTML = features.map(feature => `<span class="feature-tag">${feature}</span>`).join('');
        
        return `
            <div class="property-card" data-id="${property.id}">
                <div class="property-header">
                    <div>
                        <h3 class="property-title">${property.title}</h3>
                        <div class="property-location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${property.location.city} - ${property.location.district}
                        </div>
                    </div>
                    <span class="property-type">${property.type}</span>
                </div>
                
                <div class="property-details">
                    <div class="property-detail">
                        <div class="property-detail-label">المساحة</div>
                        <div class="property-detail-value">${property.area} م²</div>
                    </div>
                    <div class="property-detail">
                        <div class="property-detail-label">الغرف</div>
                        <div class="property-detail-value">${property.rooms || 0}</div>
                    </div>
                    <div class="property-detail">
                        <div class="property-detail-label">الحمامات</div>
                        <div class="property-detail-value">${property.bathrooms || 0}</div>
                    </div>
                    <div class="property-detail">
                        <div class="property-detail-label">الدور</div>
                        <div class="property-detail-value">${property.floor || 0}</div>
                    </div>
                </div>
                
                <div class="property-price">
                    ${property.price.toLocaleString()} ${property.currency}
                    <span class="property-price-per-meter">(${Math.round(property.price / property.area).toLocaleString()} ج.م/م²)</span>
                </div>
                
                <span class="property-status ${statusClass}">${property.status}</span>
                
                ${features.length > 0 ? `
                    <div class="property-features">
                        <h5>المميزات:</h5>
                        <div class="features-list">${featuresHTML}</div>
                    </div>
                ` : ''}
                
                <div class="property-stats">
                    <div class="property-stat">
                        <i class="fas fa-eye"></i>
                        <span>${property.views || 0} مشاهدة</span>
                    </div>
                    <div class="property-stat">
                        <i class="fas fa-question-circle"></i>
                        <span>${property.inquiries || 0} استفسار</span>
                    </div>
                </div>
                
                <div class="property-actions">
                    <button class="btn btn-sm btn-primary" onclick="realEstateBot.editProperty('${property.id}')">
                        <i class="fas fa-edit"></i>
                        تعديل
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="realEstateBot.deleteProperty('${property.id}')">
                        <i class="fas fa-trash"></i>
                        حذف
                    </button>
                </div>
            </div>
        `;
    }

    updatePropertiesStats(properties) {
        if (!this.propertiesStats) return;

        const total = properties.length;
        const available = properties.filter(p => p.status === 'متاح').length;
        const reserved = properties.filter(p => p.status === 'محجوز').length;
        const sold = properties.filter(p => p.status === 'مباع').length;
        const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);
        const totalInquiries = properties.reduce((sum, p) => sum + (p.inquiries || 0), 0);

        document.getElementById('totalProperties').textContent = total;
        document.getElementById('availableProperties').textContent = available;
        document.getElementById('reservedProperties').textContent = reserved;
        document.getElementById('soldProperties').textContent = sold;
        document.getElementById('totalViews').textContent = totalViews;
        document.getElementById('totalInquiries').textContent = totalInquiries;
    }

    openPropertyModal(propertyId = null) {
        if (propertyId) {
            this.propertyModalTitle.textContent = 'تعديل العقار';
            this.loadPropertyForEdit(propertyId);
        } else {
            this.propertyModalTitle.textContent = 'إضافة عقار جديد';
            this.propertyForm.reset();
            document.getElementById('propertyId').value = '';
        }
        
        this.propertyModal.classList.add('show');
    }

    async loadPropertyForEdit(propertyId) {
        try {
            const response = await fetch(`/api/properties/${propertyId}`);
            const property = await response.json();
            
            if (property) {
                this.populatePropertyForm(property);
            }
        } catch (error) {
            console.error('Error loading property:', error);
            this.showToast('خطأ في تحميل بيانات العقار', 'error');
        }
    }

    populatePropertyForm(property) {
        document.getElementById('propertyId').value = property.id;
        document.getElementById('propertyTitle').value = property.title;
        document.getElementById('propertyType').value = property.type;
        document.getElementById('propertyDescription').value = property.description || '';
        document.getElementById('propertyCity').value = property.location.city;
        document.getElementById('propertyDistrict').value = property.location.district;
        document.getElementById('propertyAddress').value = property.location.address;
        document.getElementById('propertyArea').value = property.area;
        document.getElementById('propertyRooms').value = property.rooms || '';
        document.getElementById('propertyBathrooms').value = property.bathrooms || '';
        document.getElementById('propertyFloor').value = property.floor || '';
        document.getElementById('propertyTotalFloors').value = property.totalFloors || '';
        document.getElementById('propertyPrice').value = property.price;
        document.getElementById('propertyPricePerMeter').value = Math.round(property.price / property.area);
        document.getElementById('propertyContactPerson').value = property.contactPerson || '';
        document.getElementById('propertyStatus').value = property.status;
        
        if (property.features) {
            document.getElementById('propertyFeatures').value = property.features.join('\n');
        }
        
        if (property.amenities) {
            document.getElementById('propertyAmenities').value = property.amenities.join('\n');
        }
        
        if (property.paymentOptions) {
            document.getElementById('propertyPaymentOptions').value = property.paymentOptions.join('\n');
        }
    }

    async saveProperty(e) {
        e.preventDefault();
        
        const propertyId = document.getElementById('propertyId').value;
        const isEdit = !!propertyId;
        
        const property = {
            title: document.getElementById('propertyTitle').value,
            type: document.getElementById('propertyType').value,
            description: document.getElementById('propertyDescription').value,
            location: {
                city: document.getElementById('propertyCity').value,
                district: document.getElementById('propertyDistrict').value,
                address: document.getElementById('propertyAddress').value
            },
            area: parseInt(document.getElementById('propertyArea').value),
            rooms: parseInt(document.getElementById('propertyRooms').value) || 0,
            bathrooms: parseInt(document.getElementById('propertyBathrooms').value) || 0,
            floor: parseInt(document.getElementById('propertyFloor').value) || 0,
            totalFloors: parseInt(document.getElementById('propertyTotalFloors').value) || 0,
            price: parseInt(document.getElementById('propertyPrice').value),
            currency: 'ج.م',
            contactPerson: document.getElementById('propertyContactPerson').value,
            status: document.getElementById('propertyStatus').value,
            features: document.getElementById('propertyFeatures').value.split('\n').filter(f => f.trim()),
            amenities: document.getElementById('propertyAmenities').value.split('\n').filter(a => a.trim()),
            paymentOptions: document.getElementById('propertyPaymentOptions').value.split('\n').filter(p => p.trim())
        };

        try {
            const url = isEdit ? `/api/properties/${propertyId}` : '/api/properties';
            const method = isEdit ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(property)
            });

            if (response.ok) {
                this.showToast(isEdit ? 'تم تحديث العقار بنجاح' : 'تم إضافة العقار بنجاح', 'success');
                this.closeModal();
                this.loadProperties();
            } else {
                throw new Error('فشل في حفظ العقار');
            }
        } catch (error) {
            console.error('Error saving property:', error);
            this.showToast('خطأ في حفظ العقار', 'error');
        }
    }

    async deleteProperty(propertyId) {
        if (!confirm('هل أنت متأكد من حذف هذا العقار؟')) {
            return;
        }

        try {
            const response = await fetch(`/api/properties/${propertyId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showToast('تم حذف العقار بنجاح', 'success');
                this.loadProperties();
            } else {
                throw new Error('فشل في حذف العقار');
            }
        } catch (error) {
            console.error('Error deleting property:', error);
            this.showToast('خطأ في حذف العقار', 'error');
        }
    }

    editProperty(propertyId) {
        this.openPropertyModal(propertyId);
    }

    searchProperties() {
        const query = this.propertySearch.value.toLowerCase();
        const propertyCards = document.querySelectorAll('.property-card');
        
        propertyCards.forEach(card => {
            const title = card.querySelector('.property-title').textContent.toLowerCase();
            const location = card.querySelector('.property-location').textContent.toLowerCase();
            const type = card.querySelector('.property-type').textContent.toLowerCase();
            
            const matches = title.includes(query) || location.includes(query) || type.includes(query);
            card.style.display = matches ? 'block' : 'none';
        });
    }

    filterProperties() {
        const typeFilter = this.typeFilter.value;
        const cityFilter = this.cityFilter.value;
        const statusFilter = this.statusFilter.value;
        
        const propertyCards = document.querySelectorAll('.property-card');
        
        propertyCards.forEach(card => {
            const type = card.querySelector('.property-type').textContent;
            const location = card.querySelector('.property-location').textContent;
            const status = card.querySelector('.property-status').textContent;
            
            const typeMatch = !typeFilter || type === typeFilter;
            const cityMatch = !cityFilter || location.includes(cityFilter);
            const statusMatch = !statusFilter || status === statusFilter;
            
            card.style.display = (typeMatch && cityMatch && statusMatch) ? 'block' : 'none';
        });
    }

    async loadAppointments() {
        try {
            const response = await fetch('/api/appointments');
            const appointments = await response.json();
            
            this.displayAppointments(appointments);
        } catch (error) {
            console.error('Error loading appointments:', error);
            this.showToast('خطأ في تحميل المواعيد', 'error');
        }
    }

    displayAppointments(appointments) {
        if (!this.appointmentsContainer) return;

        if (!appointments || appointments.length === 0) {
            this.appointmentsContainer.innerHTML = `
                <div class="appointments-placeholder">
                    <i class="fas fa-calendar-times"></i>
                    <p>لا توجد مواعيد بعد</p>
                </div>
            `;
            return;
        }

        const appointmentsHTML = appointments.map(appointment => this.createAppointmentCard(appointment)).join('');
        this.appointmentsContainer.innerHTML = appointmentsHTML;
    }

    createAppointmentCard(appointment) {
        const statusClass = appointment.status === 'مجدول' ? 'scheduled' :
                           appointment.status === 'مؤكد' ? 'confirmed' :
                           appointment.status === 'ملغي' ? 'cancelled' : 'completed';

        return `
            <div class="appointment-card">
                <div class="appointment-header">
                    <div class="appointment-client">${appointment.clientName}</div>
                    <div class="appointment-date">${appointment.date} - ${appointment.time}</div>
                </div>
                <div class="appointment-details">
                    <p><strong>الهاتف:</strong> ${appointment.clientPhone}</p>
                    <p><strong>العقار:</strong> ${appointment.propertyTitle || 'غير محدد'}</p>
                    ${appointment.notes ? `<p><strong>ملاحظات:</strong> ${appointment.notes}</p>` : ''}
                </div>
                <span class="appointment-status ${statusClass}">${appointment.status}</span>
            </div>
        `;
    }

    async loadInquiries() {
        try {
            const response = await fetch('/api/inquiries');
            const inquiries = await response.json();
            
            this.displayInquiries(inquiries);
        } catch (error) {
            console.error('Error loading inquiries:', error);
            this.showToast('خطأ في تحميل الاستفسارات', 'error');
        }
    }

    displayInquiries(inquiries) {
        if (!this.inquiriesContainer) return;

        if (!inquiries || inquiries.length === 0) {
            this.inquiriesContainer.innerHTML = `
                <div class="inquiries-placeholder">
                    <i class="fas fa-inbox"></i>
                    <p>لا توجد استفسارات بعد</p>
                </div>
            `;
            return;
        }

        const inquiriesHTML = inquiries.slice(0, 10).map(inquiry => this.createInquiryCard(inquiry)).join('');
        this.inquiriesContainer.innerHTML = inquiriesHTML;
    }

    createInquiryCard(inquiry) {
        return `
            <div class="inquiry-card">
                <div class="inquiry-header">
                    <div class="inquiry-client">${inquiry.clientName || inquiry.clientPhone}</div>
                    <div class="inquiry-date">${new Date(inquiry.timestamp).toLocaleString('ar-EG')}</div>
                </div>
                <div class="inquiry-details">
                    <p><strong>الهاتف:</strong> ${inquiry.clientPhone}</p>
                    <p><strong>الاستفسار:</strong> ${inquiry.message}</p>
                    ${inquiry.propertyId ? `<p><strong>العقار:</strong> ${inquiry.propertyTitle || inquiry.propertyId}</p>` : ''}
                </div>
            </div>
        `;
    }

    filterAppointments() {
        const statusFilter = this.appointmentStatusFilter.value;
        const dateFilter = this.appointmentDateFilter.value;
        
        const appointmentCards = document.querySelectorAll('.appointment-card');
        
        appointmentCards.forEach(card => {
            const status = card.querySelector('.appointment-status').textContent;
            const dateText = card.querySelector('.appointment-date').textContent;
            const appointmentDate = dateText.split(' - ')[0];
            
            const statusMatch = !statusFilter || status === statusFilter;
            const dateMatch = !dateFilter || appointmentDate === dateFilter;
            
            card.style.display = (statusMatch && dateMatch) ? 'block' : 'none';
        });
    }

    closeModal() {
        this.propertyModal.classList.remove('show');
    }

    async loadSettings() {
        // Load AI settings
        this.socket.emit('getAIStatus');
    }

    updateAIStatus(enabled) {
        if (this.aiEnabled) {
            this.aiEnabled.checked = enabled;
            this.toggleAISettings();
        }
    }

    toggleAISettings() {
        const enabled = this.aiEnabled.checked;
        if (this.aiSettings) {
            this.aiSettings.style.display = enabled ? 'block' : 'none';
        }
    }

    async saveAISettings(e) {
        e.preventDefault();
        
        const enabled = this.aiEnabled.checked;
        const prompt = this.aiPrompt.value;
        
        this.socket.emit('updateAISettings', { enabled, prompt });
        this.showToast('تم حفظ إعدادات الذكاء الاصطناعي', 'success');
    }

    toggleApiKeyVisibility() {
        const input = this.geminiApiKey;
        const icon = this.toggleApiKey.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    addLog(type, data) {
        const timestamp = new Date().toLocaleString('ar-EG');
        this.logs.unshift({ type, data, timestamp });
        
        // Keep only last 100 logs
        if (this.logs.length > 100) {
            this.logs = this.logs.slice(0, 100);
        }
        
        this.updateLogsDisplay();
    }

    updateLogsDisplay() {
        if (!this.logsContainer) return;
        
        const logsHTML = this.logs.map(log => `
            <div class="log-item log-${log.type}">
                <div class="log-timestamp">${log.timestamp}</div>
                <div class="log-content">${JSON.stringify(log.data, null, 2)}</div>
            </div>
        `).join('');
        
        this.logsContainer.innerHTML = logsHTML || '<p>لا توجد سجلات بعد</p>';
    }

    clearLogs() {
        this.logs = [];
        this.updateLogsDisplay();
        this.showToast('تم مسح السجلات', 'success');
    }

    exportLogs() {
        const dataStr = JSON.stringify(this.logs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `whatsapp-logs-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showToast('تم تصدير السجلات', 'success');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        const container = document.getElementById('toastContainer');
        if (container) {
            container.appendChild(toast);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 5000);
        }
    }

    // Reports and Excel functions
    async loadExcelStats() {
        try {
            const response = await fetch('/api/excel/stats');
            const stats = await response.json();
            
            if (this.totalMessages) this.totalMessages.textContent = stats.messages.total;
            if (this.totalMeetings) this.totalMeetings.textContent = stats.meetings.total;
            if (this.todayMessages) this.todayMessages.textContent = stats.messages.today;
            if (this.pendingMeetings) this.pendingMeetings.textContent = stats.meetings.pending;
        } catch (error) {
            console.error('خطأ في تحميل إحصائيات Excel:', error);
        }
    }

    async downloadExcelFile(type) {
        try {
            let url;
            let filename;
            
            switch (type) {
                case 'messages':
                    url = '/api/excel/messages/download';
                    filename = 'whatsapp_messages.xlsx';
                    break;
                case 'meetings':
                    url = '/api/excel/meetings/download';
                    filename = 'meeting_requests.xlsx';
                    break;
                case 'sales':
                    url = '/api/excel/sales/download';
                    filename = 'sales_contacts.xlsx';
                    break;
                default:
                    throw new Error('نوع ملف غير صحيح');
            }

            // Create a temporary link and trigger download
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showToast('تم تحميل الملف بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في تحميل الملف:', error);
            this.showToast('فشل في تحميل الملف', 'error');
        }
    }

    // Admin functions
    performAdminLogin() {
        const username = this.adminUsername?.value;
        const password = this.adminPassword?.value;
        
        // Simple admin credentials (in production, use proper authentication)
        if (username === 'admin' && password === 'admin123') {
            localStorage.setItem('admin_logged_in', 'true');
            this.showAdminPanel();
            this.showToast('تم تسجيل الدخول بنجاح', 'success');
        } else {
            this.showToast('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
        }
    }

    performAdminLogout() {
        localStorage.removeItem('admin_logged_in');
        this.hideAdminPanel();
        this.showToast('تم تسجيل الخروج', 'info');
    }

    showAdminPanel() {
        if (this.adminLogin) this.adminLogin.style.display = 'none';
        if (this.adminPanel) this.adminPanel.style.display = 'block';
    }

    hideAdminPanel() {
        if (this.adminLogin) this.adminLogin.style.display = 'block';
        if (this.adminPanel) this.adminPanel.style.display = 'none';
        if (this.adminUsername) this.adminUsername.value = '';
        if (this.adminPassword) this.adminPassword.value = '';
    }

    checkAdminStatus() {
        const isLoggedIn = localStorage.getItem('admin_logged_in') === 'true';
        if (isLoggedIn) {
            this.showAdminPanel();
        } else {
            this.hideAdminPanel();
        }
    }

    // Override switchTab to load stats when reports tab is opened
    switchTab(tabName) {
        // Remove active class from all tabs and contents
        this.tabButtons.forEach(btn => btn.classList.remove('active'));
        this.tabContents.forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
        const selectedContent = document.getElementById(tabName);

        if (selectedTab && selectedContent) {
            selectedTab.classList.add('active');
            selectedContent.classList.add('active');

            // Load specific data based on tab
            switch (tabName) {
                case 'business':
                    this.loadBusiness();
                    break;
                case 'properties':
                    this.loadProperties();
                    this.loadPropertiesStats();
                    break;
                case 'appointments':
                    this.loadAppointments();
                    break;
                case 'reports':
                    this.loadExcelStats();
                    this.checkAdminStatus();
                    break;
            }
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.realEstateBot = new RealEstateBot();
});