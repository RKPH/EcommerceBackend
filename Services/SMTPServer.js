const SMTPServer = require('smtp-server').SMTPServer;
const fs = require('fs');
const path = require('path');

// Create a directory to store emails if it doesn't exist
const emailDir = path.join(__dirname, '../emails');
if (!fs.existsSync(emailDir)) {
    fs.mkdirSync(emailDir);
}

// Create SMTP server
const server = new SMTPServer({
    secure: false,
    authOptional: true,
    disabledCommands: ['STARTTLS'],
    onData(stream, session, callback) {
        let mailData = '';
        
        stream.on('data', (chunk) => {
            mailData += chunk;
        });

        stream.on('end', () => {
            // Generate unique filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `email-${timestamp}.eml`;
            const filepath = path.join(emailDir, filename);

            // Save email to file
            fs.writeFileSync(filepath, mailData);
            
            console.log(`Email saved to: ${filepath}`);
            callback();
        });
    }
});

// Start the server
const PORT = process.env.SMTP_PORT || 2525;
server.listen(PORT, () => {
    console.log(`SMTP Server running on port ${PORT}`);
});

module.exports = server; 