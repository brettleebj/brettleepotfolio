const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.')); // Serve static files

// Path to messages file
const messagesFile = path.join(__dirname, 'messages.json');

// Initialize messages file if it doesn't exist
if (!fs.existsSync(messagesFile)) {
    fs.writeFileSync(messagesFile, JSON.stringify([], null, 2));
}

// Routes
app.get('/api/messages', (req, res) => {
    try {
        const messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
        res.json(messages);
    } catch (error) {
        console.error('Error reading messages:', error);
        res.status(500).json({ error: 'Failed to read messages' });
    }
});

app.post('/api/messages', (req, res) => {
    try {
        const { name, email, message } = req.body;

        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Name, email, and message are required' });
        }

        // Read existing messages
        const messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));

        // Create new message
        const newMessage = {
            id: Date.now(),
            name: name.trim(),
            email: email.trim(),
            message: message.trim(),
            date: new Date().toISOString(),
            read: false
        };

        // Add to messages array
        messages.unshift(newMessage); // Add to beginning for newest first

        // Save to file
        fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));

        console.log(`New message received from ${name} (${email})`);

        res.json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ error: 'Failed to save message' });
    }
});

app.put('/api/messages/:id/read', (req, res) => {
    try {
        const messageId = parseInt(req.params.id);
        const messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));

        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        if (messageIndex === -1) {
            return res.status(404).json({ error: 'Message not found' });
        }

        messages[messageIndex].read = true;
        fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating message:', error);
        res.status(500).json({ error: 'Failed to update message' });
    }
});

app.delete('/api/messages/:id', (req, res) => {
    try {
        const messageId = parseInt(req.params.id);
        const messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));

        const filteredMessages = messages.filter(msg => msg.id !== messageId);
        fs.writeFileSync(messagesFile, JSON.stringify(filteredMessages, null, 2));

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
    console.log(`Portfolio: http://localhost:${PORT}/index.html`);
});
