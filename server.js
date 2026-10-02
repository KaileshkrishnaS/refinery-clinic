const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'appointments.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize local JSON storage if not exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
}

// Helper to read data safely
const readAppointments = () => {
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        return [];
    }
};

// Helper to write data safely
const writeAppointments = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
};

// Auth Middleware (Basic check for prototype)
const checkAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized request' });
    next();
};

// --- API ROUTES ---

// Login API
app.post('/api/login', (req, res) => {
    const { username, password, portal } = req.body;
    if (portal === 'database' && username === 'sk product' && password === '1234') {
        return res.json({ success: true, token: 'db-auth-token-secret' });
    }
    if (portal === 'admin' && username === 'refinery' && password === '1234') {
        return res.json({ success: true, token: 'admin-auth-token-secret' });
    }
    return res.status(401).json({ success: false, message: 'Invalid username or password.' });
});

// CREATE: Book Appointment
app.post('/api/appointments', (req, res) => {
    try {
        const { name, age, problem, clinic, location, date, timeSlot } = req.body;

        if (!name || !age || !problem || !clinic || !location || !date || !timeSlot) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const appointments = readAppointments();
        
        // Generate Unique ID (e.g., REF-8492)
        const newId = 'REF-' + Math.floor(1000 + Math.random() * 9000);
        
        const newAppointment = {
            id: newId,
            name: name.trim(),
            age: parseInt(age, 10),
            problem: problem.trim(),
            clinic: clinic.trim(),
            location: location.trim(),
            date: date,
            timeSlot: timeSlot,
            createdAt: new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
        };

        appointments.push(newAppointment);
        writeAppointments(appointments);

        res.status(201).json({ success: true, appointment: newAppointment });
    } catch (err) {
        res.status(500).json({ error: 'Failed to process appointment.' });
    }
});

// READ: Fetch Appointments (Optionally filter by clinic)
app.get('/api/appointments', (req, res) => {
    let data = readAppointments();
    if (req.query.clinic) {
        data = data.filter(item => item.clinic.toLowerCase() === req.query.clinic.toLowerCase());
    }
    res.json(data);
});

// UPDATE: Modify appointment field directly (Spreadsheet direct-edit support)
app.put('/api/appointments/:id', checkAuth, (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    let appointments = readAppointments();
    const index = appointments.findIndex(item => item.id === id);

    if (index === -1) {
        return res.status(404).json({ error: 'Appointment record not found.' });
    }

    appointments[index] = { ...appointments[index], ...updateData };
    writeAppointments(appointments);

    res.json({ success: true, appointment: appointments[index] });
});

// DELETE: Remove appointment
app.delete('/api/appointments/:id', checkAuth, (req, res) => {
    const { id } = req.params;
    let appointments = readAppointments();
    const filtered = appointments.filter(item => item.id !== id);

    if (appointments.length === filtered.length) {
        return res.status(404).json({ error: 'Appointment not found.' });
    }

    writeAppointments(filtered);
    res.json({ success: true, message: 'Appointment deleted successfully.' });
});

app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(` REFINERY Clinic Server running at http://localhost:${PORT}`);
    console.log(`--------------------------------------------------`);
    console.log(` Patient Portal:  http://localhost:${PORT}/patient.html`);
    console.log(` Database Portal: http://localhost:${PORT}/database.html`);
    console.log(` Admin Portal:    http://localhost:${PORT}/admin.html`);
    console.log(`==================================================\n`);
});