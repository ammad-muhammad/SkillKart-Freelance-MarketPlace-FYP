try {
    const controller = require('../Backend/src/controllers/skill.controller');
    console.log('Controller loaded:', controller);
} catch (e) {
    console.error('Failed to load controller:', e);
}
