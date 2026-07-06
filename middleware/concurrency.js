// middleware/concurrency.js
// Smart Queue Control — Track sesi aktif tanpa Redis (percuma)
const MAX_CONCURRENT = 200;
const SESSION_ACTIVE_WINDOW = 5 * 60 * 1000; // 5 minit
const activeSessions = new Map();

// Auto cleanup setiap 1 minit
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [sid, lastActive] of activeSessions.entries()) {
        if (now - lastActive > SESSION_ACTIVE_WINDOW) {
            activeSessions.delete(sid);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        console.log(`Concurrency cleanup: removed ${cleaned} stale sessions. Active: ${activeSessions.size}`);
    }
}, 60 * 1000);

const getQueuePosition = () => Math.max(1, activeSessions.size - MAX_CONCURRENT + 1);
const getEstimatedWaitSeconds = (pos) => Math.ceil(pos * 15);

// EJS routes — render waiting-room.ejs
const concurrencyGuard = (req, res, next) => {
    const sessionId = req.sessionID;
    if (!sessionId) return next();

    if (activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, Date.now());
        return next();
    }

    if (activeSessions.size >= MAX_CONCURRENT) {
        const queuePos = getQueuePosition();
        const waitSecs = getEstimatedWaitSeconds(queuePos);
        const lang = res.locals.lang || (req.cookies && req.cookies.lang) || 'ms';
        return res.render('waiting-room', {
            lang,
            formData: null,
            queuePosition: queuePos,
            estimatedWaitSeconds: waitSecs,
            activeCount: activeSessions.size,
            maxCount: MAX_CONCURRENT
        });
    }

    activeSessions.set(sessionId, Date.now());
    next();
};

// API routes — JSON response
const concurrencyGuardApi = (req, res, next) => {
    const sessionId = req.sessionID;
    if (!sessionId) return next();

    if (activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, Date.now());
        return next();
    }

    if (activeSessions.size >= MAX_CONCURRENT) {
        const queuePos = getQueuePosition();
        const waitSecs = getEstimatedWaitSeconds(queuePos);
        return res.status(503).json({
            error: 'queue',
            message: 'Server sedang sibuk. Sila cuba sebentar lagi.',
            queuePosition: queuePos,
            estimatedWaitSeconds: waitSecs,
            retryAfter: Math.min(waitSecs, 30)
        });
    }

    activeSessions.set(sessionId, Date.now());
    next();
};

// Polling endpoint — client check adakah boleh masuk
const queueStatusHandler = (req, res) => {
    const sessionId = req.sessionID;
    const isActive = activeSessions.has(sessionId);
    const count = activeSessions.size;
    const canEnter = isActive || count < MAX_CONCURRENT;

    if (!isActive && canEnter) {
        activeSessions.set(sessionId, Date.now());
    } else if (isActive) {
        activeSessions.set(sessionId, Date.now());
    }

    res.json({
        canEnter,
        activeCount: count,
        maxCount: MAX_CONCURRENT,
        queuePosition: canEnter ? 0 : getQueuePosition(),
        estimatedWaitSeconds: canEnter ? 0 : getEstimatedWaitSeconds(getQueuePosition())
    });
};

module.exports = { concurrencyGuard, concurrencyGuardApi, queueStatusHandler, MAX_CONCURRENT };
