var Game = function() {
  this.map = null;
  this.ninjas = [];
  this.shurikens = [];
  this.stage = null;
  this.state = "LOADING";

  this.box = new b2World(new b2Vec2(0, 0), true);
  var listener = new b2ContactListener();

  Box2D.customizeVTable(listener, [{
      original: Box2D.b2ContactListener.prototype.PostSolve,
      replacement:
          function (thsPtr, contactPtr) {
              var contact = Box2D.wrapPointer( contactPtr, b2Contact );
              var bodyA = contact.GetFixtureA().GetBody().actor;
              var bodyB = contact.GetFixtureB().GetBody().actor;

              CollisionManager.collision(bodyA, bodyB);
          }
  }]);
  this.box.SetContactListener(listener);

  // Initialize pubsub stuff
  var blinkOn = function(msg, data) {
    data.ninja.addEffect(new BlinkEffect(data.ninja));
  };
  PubSub.subscribe('ninja.create', blinkOn);
  PubSub.subscribe('ninja.revive', blinkOn);
}

Game.prototype.start = function() {
  createjs.Ticker.setFPS(60);
  createjs.Ticker.addEventListener('tick', _.bind(this.handleTick, this));
  createjs.Sound.play('bgm', {loop: -1});
  this.state = "PLAYING";
}

Game.prototype.handleTick = function(ticker_data) {
  var timestep = Math.min(ticker_data.delta, 34) / 1000.0;
  this.box.Step(timestep, 8.0, 3.0);
  this.box.ClearForces();

  this.ninjas.map(function(s){s.tick();});
  this.shurikens.map(function(s){s.tick();});
  this.map.tick();

  this.stage.update();
  TimedEventManager.tick();
}

Game.prototype.addNinja = function(data) {
  if (!NinjaSchool.canTrainNinja(data.ninja)) return false;

  var player = new Player(data);
  var position = this.map.getRandomBlankPosition();

  var ninja = NinjaSchool.trainNinja({
    player: player,
    position: position,
    color: data.ninja
  });

  this.ninjas.push(ninja);
  this.stage.addChild(ninja.view);
  PubSub.publish('ninja.create', { name: ninja.player.name, ninja: ninja });

  return true;
}

//Game.prototype.updateScore = function(player_kill, player_die) {
  // Leaderboard.updatePlayer(player_kill, {kill: 1});
//}

Game.prototype.reviveNinja = function(ninja, time) {
  this.stage.removeChild(ninja.view);
  setTimeout(function() {
    var position = game.map.getRandomBlankPosition();
    ninja.reset(position);
    game.stage.addChild(ninja.view);
    PubSub.publish('ninja.revive', {name: ninja.player.name, ninja: ninja});
  }, time);
}

Game.prototype.removeNinja = function(s) {
  this.stage.removeChild(s.view);
  this.ninjas = _.without(this.ninjas, s);
  this.box.DestroyBody(s.body);
}

Game.prototype.addShuriken = function(s) {
  this.shurikens.push(s);
  this.stage.addChild(s.view);
}

Game.prototype.removeShuriken = function(s) {
  this.stage.removeChild(s.view);
  this.shurikens = _.without(this.shurikens, s);
  this.box.DestroyBody(s.body);
}
