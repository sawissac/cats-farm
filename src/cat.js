let meow = null;

(function () {
  const canvasName = "cat-animate";

  const canvasEle = document.createElement("canvas");

  canvasEle.setAttribute("id", canvasName);
  canvasEle.style.width = "100dvw";
  canvasEle.style.height = "100dvh";
  canvasEle.style.position = "absolute";
  canvasEle.style.top = "0";
  canvasEle.style.left = "0";
  canvasEle.style.backgroundColor = "lightyellow";
  canvasEle.style.zIndex = "999";

  document.body.appendChild(canvasEle);

  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById(canvasName);

  /** @type {CanvasRenderingContext2D} */
  const ctx = canvas.getContext("2d");

  const globalSettings = {
    queue: 0,
    mouse: {
      x: null,
      y: null,
    },
    speedX: 2,
    speedY: 5,
    gravity: 1,
    fraction: 0.7,
    rectangles: [],
    rectanglesCollisionDistance: 300,
    direction: 1,
    frameSpeed: 1,
    canvas: {
      w: window.innerWidth,
      h: window.innerHeight,
    },
    magicNumber: 1,
    logs: {},
    debug: false,
  };

  const gs = globalSettings;

  function requestCanvasFrame() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gs.canvas.w = window.innerWidth;
    gs.canvas.h = window.innerHeight;
  }

  window.addEventListener("DOMContentLoaded", requestCanvasFrame);

  window.addEventListener("resize", requestCanvasFrame);

  canvas.addEventListener("mousemove", (ev) => {
    gs.mouse.x = ev.x;
    gs.mouse.y = ev.y;
    gs.direction = ev.movementX > 0 ? 1 : -1;
  });

  function handleFrameSpeed() {
    gs.frameSpeed > 100 ? (gs.frameSpeed = 1) : gs.frameSpeed++;
  }

  function createText(text, x, y, fontSize = 16, align) {
    ctx.save();
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function handleSystemStatus() {
    let descriptions = [
      `Mouse: (x: ${gs.mouse.x}, y:${gs.mouse.y})`,
      `Speed: (x:${gs.speedX}, y:${gs.speedY})`,
      `Gravity: ${gs.gravity}`,
      `Fraction: ${gs.fraction}`,
      `Cats: ${gs.rectangles.length}`,
      `Direction: ${gs.direction}`,
      `Frame Speed: ${gs.frameSpeed}`,
      `Debug: ${gs.debug ? "on" : "off"}`,
    ];

    descriptions.forEach((description, index) => {
      createText(description, 20, 20 + index * 20, 14, "left");
    });
  }

  /** @param {} num  */
  function formatNumber(num) {
    const formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      roundingMode: "trunc",
    });
    return formatter.format(num);
  }

  const fNum = formatNumber;

  function createLog(description, logId) {
    gs.logs[logId] = description;
  }

  function handleLogs() {
    let tempKeyList = {};
    let currentkeyList = Object.keys(gs.logs);

    currentkeyList.forEach((id) => {
      if (gs.logs[id] === null) return;
      tempKeyList[id] = gs.logs[id];
    });

    gs.logs = tempKeyList;

    let keyList = Object.keys(gs.logs);

    keyList.forEach((id, index) => {
      const description = gs.logs[id];
      if (!description) return;
      createText(description, canvas.width - 20, 20 + index * 20, 14, "right");
    });
  }

  function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  function Rectangle(name, x, y, width, height) {
    this.id = uuid();
    this.name = name;
    this.width = width;
    this.height = height;
    this.x = x - this.width / 2;
    this.y = y - this.height / 2;
    this.originX = x;
    this.originY = y;
    this.speedX = gs.speedX;
    this.speedY = gs.speedY;
    this.direction = gs.direction;
    this.collisionFound = false;
    this.attackActionFound = false;
    this.dx = this.speedX * this.direction;
    this.dy = this.speedY;
    this.spawnY = 20;

    /** @type {SpriteFrame} */
    this.instance = null;

    this.setInstance = (animatedFrame) => {
      this.instance = animatedFrame;
    };

    this.update = function () {
      this.physic();
      this.boundary();
      this.updateOrigin();
      this.move();
    };

    this.draw = function () {
      if (this.instance) {
        this.instance.animate(
          this.width,
          this.height,
          this.x,
          this.y,
          this.dx,
          this.name,
          this.collisionFound
        );
      }
      if (gs.debug) this.rectangleDebug();
    };

    this.move = function () {
      if (this.instance.currentState !== "running") return;

      if (this.x + this.width >= gs.canvas.w || this.x <= 0) {
        this.dx = -this.dx;
      }

      if(this.x + this.width > gs.canvas.w){
        this.x = gs.canvas.w - this.width;
      }

      this.x += this.dx;
    };

    this.actionCollision = function () {
      this.attackActionFound = false;
    };

    this.physic = function () {
      if (this.y + this.height > gs.canvas.h) {
        this.dy = parseInt(-this.dy * gs.fraction) - 0.5;
      } else {
        this.dy += gs.gravity;
      }

      if (this.y <= 0) {
        this.dy = -this.dy;
      }

      this.y += this.dy;

      let runSpeedX = 0.1;

      if (this.collisionFound && this.dx > 0) {
        this.dx += this.dx >= 5 ? 0 : runSpeedX;
      }

      if (!this.collisionFound && this.dx > 0) {
        this.dx += this.dx > gs.speedX ? -runSpeedX : 0;
      }

      if (this.collisionFound && this.dx < 0) {
        this.dx += this.dx <= -5 ? 0 : -runSpeedX;
      }

      if (!this.collisionFound && this.dx < 0) {
        this.dx += this.dx < -gs.speedX ? runSpeedX : 0;
      }
    };

    this.updateOrigin = function () {
      this.originX = this.x + this.width / 2;
      this.originY = this.y + this.height / 2;
    };

    this.boundary = function () {
      let dir = Math.random() * 2 - 1 > 0 ? gs.speedX : -gs.speedX;

      let randowmX = Math.random() * gs.canvas.w - this.width;

      if (this.y > gs.canvas.h || this.x > gs.canvas.w) {
        this.x = randowmX - this.width < 0 ? this.width : randowmX;
        this.y = this.spawnY;
        this.dx = dir;
      }
    };

    /** @param {Rectangle[]} rectangles */
    this.collision = function () {
      if (this.instance.currentState !== "running") return;

      const storedCollisionDistance = [];

      gs.rectangles.forEach((rectangle) => {
        if (this.id !== rectangle.id) {
          let dx = this.originX - rectangle.originX;
          let dy = this.originY - rectangle.originY;
          let distance = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
          distance = Math.floor(distance);

          storedCollisionDistance.push(distance);

          if (gs.debug && distance <= gs.rectanglesCollisionDistance) {
            this.collisionDistanceDebug(rectangle.originX, rectangle.originY);
          }
        }
      });

      this.collisionFound = storedCollisionDistance.some((ls) => {
        return ls <= gs.rectanglesCollisionDistance;
      });
    };

    this.remove = function () {
      gs.logs[this.id] = null;
    };

    /** @param {Rectangle[]} rectangles */
    this.collisionDistanceDebug = function (rox, roy) {
      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = 0.5;
      ctx.moveTo(this.originX, this.originY);
      ctx.lineTo(rox, roy);
      ctx.stroke();
      ctx.restore();
    };

    this.rectangleDebug = function () {
      let logText = "";

      logText += `x: ${fNum(this.x)}`;
      logText += `, y: ${fNum(this.y)}`;
      logText += `, dx: ${fNum(this.dx)}`;
      logText += `, ox: ${fNum(this.originX)}`;
      logText += `, oy: ${fNum(this.originY)}`;
      logText += `, collision: ${this.collisionFound ? "found" : "not found"}`;
      logText += `, frame: ${this.instance.frame}`;
      logText += `, n: ${this.name}`;

      createLog(logText, this.id);

      ctx.save();
      ctx.strokeStyle = "black";
      ctx.strokeRect(this.x, this.y, this.width, this.height);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "green";
      ctx.beginPath();
      ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(this.originX, this.originY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "blue";
      createText(
        this.name,
        this.originX,
        this.originY - this.height / 2 - 10,
        14,
        "center"
      );
      ctx.restore();
    };
  }

  /**   */
  function CatSpriteFrame(spriteLists) {
    this.frame = 0;
    this.spriteWidth = 0;
    this.spriteHeight = 0;
    this.width = this.spriteWidth;
    this.height = this.spriteHeight;
    this.runningImage = new Image();
    this.runningImage.src = spriteLists[0][0];
    this.idelImage = new Image();
    this.idelImage.src = spriteLists[1][0];
    this.attackImage = new Image();
    this.attackImage.src = spriteLists[2][0];
    this.steps = 0;
    this.states = ["running", "idel", "attack"];
    this.currentState = "running";
    this.stateChangeCycle = 100;

    this.runningImage.onerror = (error) => {
      console.log(error);
    };
    this.idelImage.onerror = (error) => {
      console.log(error);
    };
    this.attackImage.onerror = (error) => {
      console.log(error);
    };

    this.animate = (w, h, x, y, dx, name, collisionFound) => {
      this.update(collisionFound);
      this.draw(x, y, dx, name);
      this.setFrame(w, h);
    };

    this.update = function (collisionFound) {
      if (gs.frameSpeed % 6 === 0) {
        const totalSprite = spriteLists
          ?.at(this.states.indexOf(this.currentState))
          ?.at(1);

        if (this.frame >= totalSprite - 1) {
          this.frame = -1;
        }

        if (this.steps === this.stateChangeCycle) {
          let randomNumber = Math.floor(Math.random() * this.states.length);

          let randomState = this.states.at(randomNumber);

          if (!collisionFound && randomState === "attack") {
            randomState = "idel";
          }

          this.currentState = randomState;

          this.steps = 0;
        }

        this.frame++;
        this.steps++;
      }
    };

    this.setFrame = function (w, h) {
      this.spriteWidth = w;
      this.spriteHeight = h;
      this.width = this.spriteWidth;
      this.height = this.spriteHeight;
    };

    this.draw = function (x, y, dx, name) {
      let selectedSprite = null;
      let nextFrame = this.frame * this.spriteWidth;

      if (this.currentState === "running") {
        selectedSprite = this.runningImage;
      } else if (this.currentState === "idel") {
        selectedSprite = this.idelImage;
      } else if (this.currentState === "attack") {
        selectedSprite = this.attackImage;
      }

      if (dx < 0) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(
          selectedSprite,
          nextFrame,
          0,
          this.spriteWidth,
          this.spriteHeight,
          -x - this.width,
          y,
          this.width,
          this.height
        );
        ctx.restore();
      } else {
        ctx.save();
        ctx.drawImage(
          selectedSprite,
          nextFrame,
          0,
          this.spriteWidth,
          this.spriteHeight,
          x,
          y,
          this.width,
          this.height
        );
        ctx.restore();
      }
    };
  }

  canvas.addEventListener("click", (_) => {
    let rectWidth = 130;
    let rectHeight = 59;

    if (gs.mouse.x + rectWidth >= gs.canvas.w) {
      gs.mouse.x = gs.canvas.w - rectWidth;
    }

    if (gs.mouse.x - rectWidth <= 0) {
      gs.mouse.x = rectWidth;
    }

    if (gs.mouse.y + rectHeight >= gs.canvas.h) {
      gs.mouse.y = gs.canvas.h - rectHeight;
    }

    if (gs.mouse.y - rectHeight <= 0) {
      gs.mouse.y = rectHeight;
    }

    const rectangle = new Rectangle(
      `Rectangle ${gs.magicNumber}`,
      gs.mouse.x,
      gs.mouse.y,
      130,
      59
    );

    if (gs.queue === 0) {
      rectangle.setInstance(
        new CatSpriteFrame([
          [black_cat_run_sprite, 10],
          [black_cat_idel_sprite, 8],
          [black_cat_swipe_sprite, 9],
        ])
      );
    }

    if (gs.queue === 1) {
      rectangle.setInstance(
        new CatSpriteFrame([
          [brown_cat_run_sprite, 9],
          [brown_cat_idel_sprite, 8],
          [brown_cat_swipe_sprite, 9],
        ])
      );
    }

    if (gs.queue === 2) {
      rectangle.setInstance(
        new CatSpriteFrame([
          [grey_cat_run_sprite, 9],
          [grey_cat_idel_sprite, 8],
          [grey_cat_swipe_sprite, 9],
        ])
      );
    }

    if (gs.queue === 3) {
      rectangle.setInstance(
        new CatSpriteFrame([
          [lightbrown_cat_run_sprite, 9],
          [lightbrown_cat_idel_sprite, 8],
          [lightbrown_cat_swipe_sprite, 9],
        ])
      );
    }

    if (gs.queue === 4) {
      rectangle.setInstance(
        new CatSpriteFrame([
          [white_cat_run_sprite, 9],
          [white_cat_idel_sprite, 8],
          [white_cat_swipe_sprite, 9],
        ])
      );
    }

    if (gs.queue >= 4) {
      gs.queue = 0;
    } else {
      gs.queue++;
    }

    gs.rectangles.push(rectangle);
    gs.magicNumber++;
  });

  function handleFrameSpeed() {
    gs.frameSpeed++;
  }

  function handleRectangle() {
    gs.rectangles.forEach((rectangle) => {
      rectangle.update();
      rectangle.draw();
      rectangle.collision();
    });
  }

  let animationFrameId = null;

  function initStartAnimationFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gs.debug && handleSystemStatus();
    gs.debug && handleLogs();
    handleFrameSpeed();
    handleRectangle();
    animationFrameId = requestAnimationFrame(initStartAnimationFrame);
  }

  function cancelCanvasAnimationFrame() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function startCanvasAnimationFrame() {
    cancelCanvasAnimationFrame();
    gs.debug = false;
    initStartAnimationFrame();
  }

  function startDebugCansvasAnimationFrame() {
    cancelCanvasAnimationFrame();
    gs.debug = true;
    initStartAnimationFrame();
  }

  startCanvasAnimationFrame();

  meow = {
    gs,
    startCanvasAnimationFrame,
    cancelCanvasAnimationFrame,
    startDebugCansvasAnimationFrame,
  };
})();
