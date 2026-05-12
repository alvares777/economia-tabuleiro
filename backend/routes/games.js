const router = require('express').Router();
const ctrl   = require('../controllers/gamesController');

router.get('/:userId',                ctrl.listGames);
router.get('/:userId/:gameId',        ctrl.loadGame);
router.post('/',                      ctrl.saveGame);
router.delete('/:userId/:gameId',     ctrl.deleteGame);
router.patch('/:userId/:gameId/name', ctrl.renameGame);

module.exports = router;
