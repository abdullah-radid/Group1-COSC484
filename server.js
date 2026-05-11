const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/towson_apartments';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err.message));

const userSchema = new mongoose.Schema({
    role: { type: String, enum: ['resident', 'maintenance', 'admin'], required: true },
    name: { type: String, required: true },
    email: String,
    employeeID: Number,
    password: { type: String, required: true },
    adminCode: Number,
    unit: String,
    leaseEnds: String,
    phone: String,
    notes: String,
    rentStatus: { type: String, default: 'Current' },
    status: { type: String, default: 'Active' }
}, { timestamps: true });

const maintenanceRequestSchema = new mongoose.Schema({
    orderNumber: { type: Number, default: () => Math.floor(1000 + Math.random() * 9000) },
    unit: { type: String, default: '101' },
    issueType: { type: String, required: true },
    urgency: { type: String, required: true },
    description: { type: String, required: true },
    availability: String,
    status: { type: String, default: 'Open' },
    notes: String
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
    unit: { type: String, default: '101' },
    category: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    status: { type: String, default: 'Unread' }
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
    residentId: String,
    residentName: String,
    unit: { type: String, default: '101' },
    cardName: { type: String, required: true },
    cardLast4: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, default: 'Submitted' }
}, { timestamps: true });

const noticeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    postDate: { type: String, required: true },
    body: { type: String, required: true },
    status: { type: String, default: 'Active' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const MaintenanceRequest = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);
const Message = mongoose.model('Message', messageSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Notice = mongoose.model('Notice', noticeSchema);

async function seedUsers() {
    const count = await User.countDocuments();
    if (count > 0) return;

    await User.insertMany([
        { role: 'resident', name: 'John Smith', email: 'resident@test.com', password: 'password123', unit: '101', leaseEnds: 'Aug 31, 2026', rentStatus: 'Current' },
        { role: 'resident', name: 'Sarah Williams', email: 'sarah@test.com', password: 'password123', unit: '418', leaseEnds: 'Sep 30, 2026', rentStatus: 'Overdue' },
        { role: 'maintenance', name: 'Maintenance Staff', employeeID: 1001, password: 'password123' },
        { role: 'admin', name: 'Admin User', employeeID: 9001, password: 'password123', adminCode: 1234 }
    ]);
    console.log('Seeded starter users');
}

mongoose.connection.once('open', seedUsers);

function sendError(res, message, status) {
    res.status(status || 400).json({ error: message });
}

app.post('/api/login', async (req, res) => {
    try {
        const { role, email, employeeID, password, adminCode } = req.body;
        const query = { role, password };

        if (role === 'resident') query.email = email;
        if (role === 'maintenance') query.employeeID = Number(employeeID);
        if (role === 'admin') {
            query.employeeID = Number(employeeID);
            query.adminCode = Number(adminCode);
        }

        const user = await User.findOne(query).select('-password -adminCode');
        if (!user) return sendError(res, 'Invalid login information.', 401);
        res.json({ user });
    } catch (err) {
        sendError(res, err.message, 500);
    }
});

app.get('/api/residents', async (req, res) => {
    const residents = await User.find({ role: 'resident' }).select('-password -adminCode').sort({ unit: 1 });
    res.json(residents);
});

app.post('/api/residents', async (req, res) => {
    try {
        const { name, email, password, unit, leaseEnds, phone, notes } = req.body;

        if (!name || !email || !password || !unit || !leaseEnds) {
            return sendError(res, 'Name, email, password, unit, and lease end date are required.');
        }

        const existing = await User.findOne({ role: 'resident', email });
        if (existing) {
            return sendError(res, 'A resident with that email already exists.');
        }

        const resident = await User.create({
            role: 'resident',
            name,
            email,
            password,
            unit,
            leaseEnds,
            phone,
            notes,
            rentStatus: 'Current',
            status: 'Active'
        });

        const cleanResident = resident.toObject();
        delete cleanResident.password;
        delete cleanResident.adminCode;

        res.status(201).json({ message: 'Resident added successfully.', resident: cleanResident });
    } catch (err) {
        sendError(res, err.message, 500);
    }
});

app.post('/api/maintenance-requests', async (req, res) => {
    try {
        const request = await MaintenanceRequest.create({
            unit: req.body.unit || '101',
            issueType: req.body.issueType,
            urgency: req.body.urgency,
            description: req.body.description,
            availability: req.body.availability,
            status: req.body.status || 'Open',
            notes: req.body.notes || ''
        });
        res.status(201).json(request);
    } catch (err) {
        sendError(res, err.message);
    }
});

app.get('/api/maintenance-requests', async (req, res) => {
    try {
        const query = {};
        if (req.query.unit) query.unit = String(req.query.unit);
        const requests = await MaintenanceRequest.find(query).sort({ updatedAt: -1, createdAt: -1 });
        res.json(requests);
    } catch (err) {
        sendError(res, err.message, 500);
    }
});

app.patch('/api/maintenance-requests/:id', async (req, res) => {
    try {
        let request;
        const updateData = { ...req.body };
        const statusMap = {
            pending: 'Pending',
            in_progress: 'In Progress',
            completed: 'Completed',
            on_hold: 'On Hold'
        };
        if (updateData.status && statusMap[updateData.status]) updateData.status = statusMap[updateData.status];

        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            request = await MaintenanceRequest.findByIdAndUpdate(req.params.id, updateData, { new: true });
        }
        if (!request) {
            request = await MaintenanceRequest.findOneAndUpdate({ orderNumber: Number(req.params.id) }, updateData, { new: true });
        }
        if (!request) return sendError(res, 'Work order not found.', 404);
        res.json(request);
    } catch (err) {
        sendError(res, err.message);
    }
});

app.post('/api/messages', async (req, res) => {
    try {
        const message = await Message.create(req.body);
        res.status(201).json(message);
    } catch (err) {
        sendError(res, err.message);
    }
});

app.get('/api/messages', async (req, res) => {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
});

app.patch('/api/messages/:id', async (req, res) => {
    try {
        const message = await Message.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!message) return sendError(res, 'Message not found.', 404);
        res.json(message);
    } catch (err) {
        sendError(res, err.message);
    }
});

app.get('/api/resident-updates', async (req, res) => {
    try {
        const unit = req.query.unit;

        const notices = await Notice.find({ status: { $ne: 'Inactive' } }).sort({ createdAt: -1 }).limit(5);
        const maintenanceQuery = unit ? { unit } : {};
        const workOrders = await MaintenanceRequest.find(maintenanceQuery).sort({ updatedAt: -1, createdAt: -1 }).limit(5);

        const updates = [];

        notices.forEach(n => {
            updates.push({
                type: 'announcement',
                id: n._id,
                title: n.title,
                message: n.body,
                status: n.status || 'Active',
                date: n.createdAt
            });
        });

        workOrders.forEach(o => {
            updates.push({
                type: 'work_order',
                id: o._id,
                title: `Work Order #${o.orderNumber}: ${o.status}`,
                message: `${o.issueType} request for Unit ${o.unit}. ${o.notes ? 'Notes: ' + o.notes : o.description}`,
                status: o.status,
                date: o.updatedAt || o.createdAt
            });
        });

        updates.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json(updates);
    } catch (err) {
        sendError(res, err.message, 500);
    }
});

app.post('/api/payments', async (req, res) => {
    try {
        const digits = String(req.body.cardNumber || '').replace(/\D/g, '');
        if (digits.length < 4) return sendError(res, 'Card number is invalid.');

        const payment = await Payment.create({
            residentId: req.body.residentId,
            residentName: req.body.residentName,
            unit: req.body.unit || '101',
            cardName: req.body.cardName,
            cardLast4: digits.slice(-4),
            amount: Number(req.body.amount),
            status: 'Submitted'
        });

        let updatedResident = null;
        if (req.body.residentId && mongoose.Types.ObjectId.isValid(req.body.residentId)) {
            updatedResident = await User.findByIdAndUpdate(
                req.body.residentId,
                { rentStatus: 'Paid' },
                { new: true }
            ).select('-password -adminCode');
        } else if (req.body.unit) {
            updatedResident = await User.findOneAndUpdate(
                { role: 'resident', unit: req.body.unit },
                { rentStatus: 'Paid' },
                { new: true }
            ).select('-password -adminCode');
        }

        res.status(201).json({ payment, resident: updatedResident });
    } catch (err) {
        sendError(res, err.message);
    }
});

app.get('/api/payments', async (req, res) => {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json(payments);
});

app.post('/api/notices', async (req, res) => {
    try {
        const notice = await Notice.create(req.body);
        res.status(201).json(notice);
    } catch (err) {
        sendError(res, err.message);
    }
});

app.get('/api/notices', async (req, res) => {
    const notices = await Notice.find().sort({ createdAt: -1 });
    res.json(notices);
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT}/Login.html to get started`);
});
