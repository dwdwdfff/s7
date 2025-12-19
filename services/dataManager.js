const fs = require('fs-extra');
const path = require('path');

class DataManager {
    constructor() {
        this.businessDataPath = path.join(__dirname, '..', 'data', 'business.json');
        this.propertiesDataPath = path.join(__dirname, '..', 'data', 'products.json'); // Keep same file for compatibility
        this.appointmentsDataPath = path.join(__dirname, '..', 'data', 'appointments.json');
        this.businessData = null;
        this.propertiesData = null;
        this.appointmentsData = null;
        
        this.loadData();
    }

    async loadData() {
        try {
            // Load business data
            if (await fs.pathExists(this.businessDataPath)) {
                const businessRaw = await fs.readFile(this.businessDataPath, 'utf8');
                this.businessData = JSON.parse(businessRaw);
                console.log('✅ تم تحميل بيانات البزنس بنجاح');
            }

            // Load properties data
            if (await fs.pathExists(this.propertiesDataPath)) {
                const propertiesRaw = await fs.readFile(this.propertiesDataPath, 'utf8');
                this.propertiesData = JSON.parse(propertiesRaw);
                console.log('✅ تم تحميل بيانات العقارات بنجاح');
            }

            // Load appointments data
            if (await fs.pathExists(this.appointmentsDataPath)) {
                const appointmentsRaw = await fs.readFile(this.appointmentsDataPath, 'utf8');
                this.appointmentsData = JSON.parse(appointmentsRaw);
                console.log('✅ تم تحميل بيانات المواعيد بنجاح');
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات:', error);
        }
    }

    // Business data methods
    getBusinessInfo() {
        return this.businessData?.businessInfo || null;
    }

    async updateBusinessInfo(newBusinessInfo) {
        try {
            this.businessData = { businessInfo: newBusinessInfo };
            await fs.writeFile(this.businessDataPath, JSON.stringify(this.businessData, null, 2), 'utf8');
            console.log('✅ تم تحديث بيانات البزنس بنجاح');
            return true;
        } catch (error) {
            console.error('❌ خطأ في تحديث بيانات البزنس:', error);
            return false;
        }
    }

    // Properties data methods
    getAllProperties() {
        return this.propertiesData?.properties || [];
    }

    // Keep compatibility with old product methods
    getAllProducts() {
        return this.getAllProperties();
    }

    getProductById(productId) {
        const products = this.getAllProducts();
        return products.find(product => product.id === productId) || null;
    }

    searchProducts(query) {
        const products = this.getAllProducts();
        const searchTerm = query.toLowerCase();
        
        return products.filter(product => {
            // Search in name, description, category, brand, and tags
            const searchFields = [
                product.name,
                product.description,
                product.category,
                product.brand,
                ...(product.tags || [])
            ].join(' ').toLowerCase();
            
            return searchFields.includes(searchTerm);
        });
    }

    getProductsByCategory(category) {
        const products = this.getAllProducts();
        return products.filter(product => 
            product.category.toLowerCase() === category.toLowerCase()
        );
    }

    getProductsByBrand(brand) {
        const products = this.getAllProducts();
        return products.filter(product => 
            product.brand.toLowerCase() === brand.toLowerCase()
        );
    }

    getInStockProducts() {
        const products = this.getAllProducts();
        return products.filter(product => product.inStock && product.quantity > 0);
    }

    getProductsByPriceRange(minPrice, maxPrice) {
        const products = this.getAllProducts();
        return products.filter(product => 
            product.price >= minPrice && product.price <= maxPrice
        );
    }

    async addProduct(product) {
        try {
            const products = this.getAllProducts();
            
            // Generate ID if not provided
            if (!product.id) {
                product.id = this.generateProductId(product.name);
            }
            
            // Check if product already exists
            if (this.getProductById(product.id)) {
                throw new Error('منتج بهذا المعرف موجود بالفعل');
            }
            
            products.push(product);
            this.productsData.products = products;
            
            await fs.writeFile(this.productsDataPath, JSON.stringify(this.productsData, null, 2), 'utf8');
            console.log('✅ تم إضافة المنتج بنجاح:', product.name);
            return true;
        } catch (error) {
            console.error('❌ خطأ في إضافة المنتج:', error);
            return false;
        }
    }

    async updateProduct(productId, updatedProduct) {
        try {
            const products = this.getAllProducts();
            const productIndex = products.findIndex(p => p.id === productId);
            
            if (productIndex === -1) {
                throw new Error('المنتج غير موجود');
            }
            
            products[productIndex] = { ...products[productIndex], ...updatedProduct };
            this.productsData.products = products;
            
            await fs.writeFile(this.productsDataPath, JSON.stringify(this.productsData, null, 2), 'utf8');
            console.log('✅ تم تحديث المنتج بنجاح:', productId);
            return true;
        } catch (error) {
            console.error('❌ خطأ في تحديث المنتج:', error);
            return false;
        }
    }

    async deleteProduct(productId) {
        try {
            const products = this.getAllProducts();
            const filteredProducts = products.filter(p => p.id !== productId);
            
            if (filteredProducts.length === products.length) {
                throw new Error('المنتج غير موجود');
            }
            
            this.productsData.products = filteredProducts;
            
            await fs.writeFile(this.productsDataPath, JSON.stringify(this.productsData, null, 2), 'utf8');
            console.log('✅ تم حذف المنتج بنجاح:', productId);
            return true;
        } catch (error) {
            console.error('❌ خطأ في حذف المنتج:', error);
            return false;
        }
    }

    // Utility methods
    generateProductId(productName) {
        return productName
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .substring(0, 50) + '-' + Date.now(); // Add timestamp for uniqueness
    }

    getCategories() {
        const products = this.getAllProducts();
        const categories = [...new Set(products.map(p => p.category))];
        return categories.sort();
    }

    getBrands() {
        const products = this.getAllProducts();
        const brands = [...new Set(products.map(p => p.brand))];
        return brands.sort();
    }

    getProductStats() {
        const products = this.getAllProducts();
        const inStockProducts = this.getInStockProducts();
        
        return {
            totalProducts: products.length,
            inStockProducts: inStockProducts.length,
            outOfStockProducts: products.length - inStockProducts.length,
            categories: this.getCategories().length,
            brands: this.getBrands().length,
            averagePrice: products.length > 0 ? 
                Math.round(products.reduce((sum, p) => sum + p.price, 0) / products.length) : 0
        };
    }

    // Smart search with AI-like features
    smartSearch(query) {
        const products = this.getAllProducts();
        const searchTerm = query.toLowerCase();
        
        // Define search weights
        const results = products.map(product => {
            let score = 0;
            
            // Exact name match gets highest score
            if (product.name.toLowerCase().includes(searchTerm)) {
                score += 10;
            }
            
            // Category match
            if (product.category.toLowerCase().includes(searchTerm)) {
                score += 8;
            }
            
            // Brand match
            if (product.brand.toLowerCase().includes(searchTerm)) {
                score += 7;
            }
            
            // Description match
            if (product.description.toLowerCase().includes(searchTerm)) {
                score += 5;
            }
            
            // Tags match
            if (product.tags && product.tags.some(tag => tag.toLowerCase().includes(searchTerm))) {
                score += 6;
            }
            
            // Features match
            if (product.features && product.features.some(feature => feature.toLowerCase().includes(searchTerm))) {
                score += 4;
            }
            
            return { product, score };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(result => result.product);
        
        return results;
    }

    // Get product recommendations based on a product
    getRecommendations(productId, limit = 3) {
        const targetProduct = this.getProductById(productId);
        if (!targetProduct) return [];
        
        const products = this.getAllProducts().filter(p => p.id !== productId);
        
        const recommendations = products.map(product => {
            let score = 0;
            
            // Same category gets high score
            if (product.category === targetProduct.category) {
                score += 10;
            }
            
            // Same brand gets medium score
            if (product.brand === targetProduct.brand) {
                score += 7;
            }
            
            // Similar price range gets score
            const priceDiff = Math.abs(product.price - targetProduct.price);
            const priceScore = Math.max(0, 5 - (priceDiff / targetProduct.price) * 5);
            score += priceScore;
            
            // Common tags get score
            if (targetProduct.tags && product.tags) {
                const commonTags = targetProduct.tags.filter(tag => 
                    product.tags.includes(tag)
                ).length;
                score += commonTags * 2;
            }
            
            return { product, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(result => result.product);
        
        return recommendations;
    }

    // Format product for display
    formatProductForDisplay(product) {
        if (!product) return null;
        
        const discount = product.originalPrice ? 
            Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
        
        return {
            ...product,
            formattedPrice: `${product.price} ${product.currency}`,
            formattedOriginalPrice: product.originalPrice ? `${product.originalPrice} ${product.currency}` : null,
            discount: discount > 0 ? `${discount}%` : null,
            availability: product.inStock && product.quantity > 0 ? 'متوفر' : 'غير متوفر',
            stockStatus: product.quantity > 10 ? 'متوفر بكثرة' : 
                        product.quantity > 0 ? `متبقي ${product.quantity} قطع` : 'نفد المخزون'
        };
    }

    // Real Estate specific methods
    getPropertyById(propertyId) {
        const properties = this.getAllProperties();
        return properties.find(property => property.id === propertyId) || null;
    }

    getPropertiesByType(type) {
        const properties = this.getAllProperties();
        return properties.filter(property => 
            property.type.toLowerCase() === type.toLowerCase()
        );
    }

    getPropertiesByLocation(city, district = null) {
        const properties = this.getAllProperties();
        return properties.filter(property => {
            const matchesCity = property.location.city.toLowerCase() === city.toLowerCase();
            if (district) {
                return matchesCity && property.location.district.toLowerCase() === district.toLowerCase();
            }
            return matchesCity;
        });
    }

    getPropertiesByPriceRange(minPrice, maxPrice) {
        const properties = this.getAllProperties();
        return properties.filter(property => 
            property.price >= minPrice && property.price <= maxPrice
        );
    }

    async addProperty(property) {
        try {
            const properties = this.getAllProperties();
            
            // Generate ID if not provided
            if (!property.id) {
                property.id = this.generatePropertyId(property.title);
            }
            
            // Check if property already exists
            if (this.getPropertyById(property.id)) {
                throw new Error('عقار بهذا المعرف موجود بالفعل');
            }
            
            // Add default values
            property.addedDate = property.addedDate || new Date().toISOString().split('T')[0];
            property.views = property.views || 0;
            property.inquiries = property.inquiries || 0;
            property.status = property.status || 'متاح';
            
            properties.push(property);
            this.propertiesData.properties = properties;
            
            await fs.writeFile(this.propertiesDataPath, JSON.stringify(this.propertiesData, null, 2), 'utf8');
            console.log('✅ تم إضافة العقار بنجاح:', property.title);
            return true;
        } catch (error) {
            console.error('❌ خطأ في إضافة العقار:', error);
            return false;
        }
    }

    async updateProperty(propertyId, updatedProperty) {
        try {
            const properties = this.getAllProperties();
            const propertyIndex = properties.findIndex(p => p.id === propertyId);
            
            if (propertyIndex === -1) {
                throw new Error('العقار غير موجود');
            }
            
            properties[propertyIndex] = { ...properties[propertyIndex], ...updatedProperty };
            this.propertiesData.properties = properties;
            
            await fs.writeFile(this.propertiesDataPath, JSON.stringify(this.propertiesData, null, 2), 'utf8');
            console.log('✅ تم تحديث العقار بنجاح:', propertyId);
            return true;
        } catch (error) {
            console.error('❌ خطأ في تحديث العقار:', error);
            return false;
        }
    }

    async deleteProperty(propertyId) {
        try {
            const properties = this.getAllProperties();
            const filteredProperties = properties.filter(p => p.id !== propertyId);
            
            if (filteredProperties.length === properties.length) {
                throw new Error('العقار غير موجود');
            }
            
            this.propertiesData.properties = filteredProperties;
            
            await fs.writeFile(this.propertiesDataPath, JSON.stringify(this.propertiesData, null, 2), 'utf8');
            console.log('✅ تم حذف العقار بنجاح:', propertyId);
            return true;
        } catch (error) {
            console.error('❌ خطأ في حذف العقار:', error);
            return false;
        }
    }

    generatePropertyId(propertyTitle) {
        return propertyTitle
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .substring(0, 50) + '-' + Date.now(); // Add timestamp for uniqueness
    }

    // Appointments management
    getAllAppointments() {
        return this.appointmentsData?.appointments || [];
    }

    getAllInquiries() {
        return this.appointmentsData?.inquiries || [];
    }

    async addAppointment(appointment) {
        try {
            const appointments = this.getAllAppointments();
            
            appointment.id = appointment.id || 'apt-' + Date.now();
            appointment.createdAt = appointment.createdAt || new Date().toISOString();
            appointment.status = appointment.status || 'مجدول';
            
            appointments.push(appointment);
            
            if (!this.appointmentsData) {
                this.appointmentsData = { appointments: [], inquiries: [] };
            }
            this.appointmentsData.appointments = appointments;
            
            await fs.writeFile(this.appointmentsDataPath, JSON.stringify(this.appointmentsData, null, 2), 'utf8');
            console.log('✅ تم إضافة الموعد بنجاح:', appointment.id);
            return appointment;
        } catch (error) {
            console.error('❌ خطأ في إضافة الموعد:', error);
            return null;
        }
    }

    async addInquiry(inquiry) {
        try {
            const inquiries = this.getAllInquiries();
            
            inquiry.id = inquiry.id || 'inq-' + Date.now();
            inquiry.createdAt = inquiry.createdAt || new Date().toISOString();
            inquiry.status = inquiry.status || 'جديد';
            
            inquiries.push(inquiry);
            
            if (!this.appointmentsData) {
                this.appointmentsData = { appointments: [], inquiries: [] };
            }
            this.appointmentsData.inquiries = inquiries;
            
            await fs.writeFile(this.appointmentsDataPath, JSON.stringify(this.appointmentsData, null, 2), 'utf8');
            console.log('✅ تم إضافة الاستفسار بنجاح:', inquiry.id);
            return inquiry;
        } catch (error) {
            console.error('❌ خطأ في إضافة الاستفسار:', error);
            return null;
        }
    }

    async incrementPropertyViews(propertyId) {
        try {
            const property = this.getPropertyById(propertyId);
            if (property) {
                property.views = (property.views || 0) + 1;
                await this.updateProperty(propertyId, { views: property.views });
            }
        } catch (error) {
            console.error('❌ خطأ في تحديث عدد المشاهدات:', error);
        }
    }

    async incrementPropertyInquiries(propertyId) {
        try {
            const property = this.getPropertyById(propertyId);
            if (property) {
                property.inquiries = (property.inquiries || 0) + 1;
                await this.updateProperty(propertyId, { inquiries: property.inquiries });
            }
        } catch (error) {
            console.error('❌ خطأ في تحديث عدد الاستفسارات:', error);
        }
    }

    formatPropertyForDisplay(property) {
        if (!property) return null;
        
        return {
            ...property,
            formattedPrice: `${property.price?.toLocaleString()} ${property.currency || 'ج.م'}`,
            formattedPricePerMeter: property.pricePerMeter ? `${property.pricePerMeter?.toLocaleString()} ${property.currency || 'ج.م'}/م²` : null,
            formattedArea: `${property.area} م²`,
            fullAddress: `${property.location.address}, ${property.location.district}, ${property.location.city}`,
            roomsInfo: `${property.rooms} غرف، ${property.bathrooms} حمام`,
            floorInfo: property.totalFloors ? `الدور ${property.floor} من ${property.totalFloors}` : `الدور ${property.floor}`
        };
    }

    // Get admin numbers for notifications
    getAdminNumbers() {
        const business = this.getBusiness();
        let adminNumbers = business?.businessInfo?.adminNumbers || ['01126657751'];
        
        // If adminNumbers is a string (from form), convert to array
        if (typeof adminNumbers === 'string') {
            adminNumbers = adminNumbers.split('\n').map(num => num.trim()).filter(num => num);
        }
        
        // Ensure we always have at least one admin number
        if (!adminNumbers || adminNumbers.length === 0) {
            adminNumbers = ['01126657751'];
        }
        
        return adminNumbers;
    }

    // Update business info including admin numbers
    async updateBusiness(businessData) {
        try {
            // Handle admin numbers conversion
            if (businessData.adminNumbers && typeof businessData.adminNumbers === 'string') {
                businessData.adminNumbers = businessData.adminNumbers.split('\n').map(num => num.trim()).filter(num => num);
            }

            this.businessData.businessInfo = { ...this.businessData.businessInfo, ...businessData };
            
            await fs.writeFile(this.businessDataPath, JSON.stringify(this.businessData, null, 2), 'utf8');
            console.log('✅ تم تحديث بيانات الشركة بنجاح');
            return true;
        } catch (error) {
            console.error('❌ خطأ في تحديث بيانات الشركة:', error);
            return false;
        }
    }
}

module.exports = DataManager;