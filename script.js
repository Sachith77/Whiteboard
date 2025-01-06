class Whiteboard {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.currentTool = 'pencil';
        this.color = '#000000';
        this.lineWidth = 5;
        this.startX = 0;
        this.startY = 0;
        this.text = '';
        this.isTextToolActive = false;
        this.inputBox = null; // To keep track of the input box for text

        this.initializeCanvas();
        this.setupEventListeners();
        this.setupWebSocket();
    }

    initializeCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = window.innerHeight - 200;
    }

    setupEventListeners() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelector('.tool-btn.active').classList.remove('active');
                e.target.classList.add('active');
                this.currentTool = e.target.dataset.tool;
                if (this.currentTool === 'text') {
                    this.isTextToolActive = true;
                } else {
                    this.isTextToolActive = false;
                }
            });
        });

        document.querySelector('.color-picker').addEventListener('input', (e) => {
            this.color = e.target.value;
        });

        document.querySelector('.size-picker').addEventListener('input', (e) => {
            this.lineWidth = e.target.value;
        });

        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());
        this.canvas.addEventListener('click', (e) => this.handleTextInput(e));

        document.getElementById('saveBtn').addEventListener('click', () => this.saveCanvas());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearCanvas());
    }

    setupWebSocket() {
        this.ws = new WebSocket('ws://localhost:8080');
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleRemoteDrawing(data);
        };
    }

    startDrawing(e) {
        if (this.isTextToolActive) return;
        
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        this.startX = e.clientX - rect.left;
        this.startY = e.clientY - rect.top;

        this.ctx.beginPath();
        this.ctx.moveTo(this.startX, this.startY);
    }

    draw(e) {
        if (!this.isDrawing || this.isTextToolActive) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.ctx.strokeStyle = this.currentTool === 'eraser' ? '#ffffff' : this.color;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineCap = 'round';

        switch (this.currentTool) {
            case 'pencil':
            case 'eraser':
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
                break;
            case 'rectangle':
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.strokeRect(
                    this.startX,
                    this.startY,
                    x - this.startX,
                    y - this.startY
                );
                break;
            case 'circle':
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                const radius = Math.sqrt(
                    Math.pow(x - this.startX, 2) + Math.pow(y - this.startY, 2)
                );
                this.ctx.beginPath();
                this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
                this.ctx.stroke();
                break;
        }

        this.ws.send(JSON.stringify({
            tool: this.currentTool,
            color: this.color,
            lineWidth: this.lineWidth,
            startX: this.startX,
            startY: this.startY,
            endX: x,
            endY: y
        }));
    }

    stopDrawing() {
        this.isDrawing = false;
        this.ctx.beginPath();
    }

    handleRemoteDrawing(data) {
        this.ctx.strokeStyle = data.color;
        this.ctx.lineWidth = data.lineWidth;
        
        switch (data.tool) {
            case 'pencil':
            case 'eraser':
                this.ctx.beginPath();
                this.ctx.moveTo(data.startX, data.startY);
                this.ctx.lineTo(data.endX, data.endY);
                this.ctx.stroke();
                break;
        }
    }

    handleTextInput(e) {
        if (!this.isTextToolActive) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Remove existing input box if there was one
        if (this.inputBox) {
            this.inputBox.remove();
        }

        // Create an input box at the clicked position
        this.inputBox = document.createElement('input');
        this.inputBox.type = 'text';
        this.inputBox.style.position = 'absolute';
        this.inputBox.style.left = `${x}px`;
        this.inputBox.style.top = `${y}px`;
        this.inputBox.style.font = `${this.lineWidth}px Arial`;
        this.inputBox.style.color = this.color;
        this.inputBox.style.border = '1px solid #ccc';
        this.inputBox.style.padding = '5px';
        this.inputBox.style.zIndex = '10';

        document.body.appendChild(this.inputBox);
        this.inputBox.focus();

        // When the user presses "Enter", place the text on the canvas
        this.inputBox.addEventListener('blur', () => {
            this.ctx.fillStyle = this.color;
            this.ctx.font = `${this.lineWidth}px Arial`;
            this.ctx.fillText(this.inputBox.value, x, y);
            this.ws.send(JSON.stringify({
                tool: 'text',
                color: this.color,
                lineWidth: this.lineWidth,
                x: x,
                y: y,
                text: this.inputBox.value
            }));

            // Remove the input box after placing the text
            this.inputBox.remove();
        });
    }

    saveCanvas() {
        const link = document.createElement('a');
        link.download = 'whiteboard.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

window.addEventListener('load', () => {
    new Whiteboard();
});


