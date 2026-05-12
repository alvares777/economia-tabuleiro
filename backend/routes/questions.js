const router = require('express').Router();
const ctrl   = require('../controllers/questionsController');

router.get('/', ctrl.getQuestions);

module.exports = router;
