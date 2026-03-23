// moving_bg.js

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.id = "bg-canvas";
canvas.style.position = "fixed";
canvas.style.top = 0;
canvas.style.left = 0;
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.zIndex = "-1";
canvas.style.pointerEvents = "none";

const ctx = canvas.getContext("2d");
let balls = [];
const maxBalls = 30;

// Adjust canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Ball class
class Ball {
    constructor() {
        this.radius = Math.random() * 10 + 5; // 5-15px
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5; // slow speed
        this.vy = (Math.random() - 0.5) * 0.5;
        this.color = `rgba(${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, 0.3)`;
        this.alive = true;
    }

    move() {
        if(!this.alive) return;

        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if(this.x < this.radius || this.x > canvas.width - this.radius) this.vx *= -1;
        if(this.y < this.radius || this.y > canvas.height - this.radius) this.vy *= -1;

        // Random disappearance/reappearance
        if(Math.random() < 0.0005) this.alive = false;
        if(!this.alive && Math.random() < 0.005) this.alive = true;
    }

    draw() {
        if(!this.alive) return;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

// Create initial balls
for(let i=0;i<maxBalls;i++){
    balls.push(new Ball());
}

// Collision detection & merge/split
function handleCollisions() {
    for(let i=0;i<balls.length;i++){
        for(let j=i+1;j<balls.length;j++){
            const dx = balls[i].x - balls[j].x;
            const dy = balls[i].y - balls[j].y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if(dist < balls[i].radius + balls[j].radius) {
                // merge effect: adjust velocity
                const tempVx = balls[i].vx;
                const tempVy = balls[i].vy;
                balls[i].vx = balls[j].vx;
                balls[i].vy = balls[j].vy;
                balls[j].vx = tempVx;
                balls[j].vy = tempVy;

                // occasionally split
                if(Math.random() < 0.01){
                    balls.push(new Ball());
                    if(balls.length > maxBalls) balls.shift();
                }
            }
        }
    }
}

// Animation loop
function animate() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    balls.forEach(b => {
        b.move();
        b.draw();
    });
    handleCollisions();
    requestAnimationFrame(animate);
}

animate();