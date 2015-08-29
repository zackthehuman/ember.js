/*
  Ember's implementation of HTMLBars creates an enriched scope.

  * self: same as HTMLBars, this field represents the dynamic lookup
    of root keys that are not special keywords or block arguments.
  * blocks: same as HTMLBars, a bundle of named blocks the layout
    can yield to.
  * component: indicates that the scope is the layout of a component,
    which is used to trigger lifecycle hooks for the component when
    one of the streams in its layout fires.
  * attrs: a map of key-value attributes sent in by the invoker of
    a template, and available in the component's layout.
  * locals: a map of locals, produced by block params (`as |a b|`)
  * localPresent: a map of available locals to avoid expensive
    `hasOwnProperty` checks.

  The `self` field has two special meanings:

  * If `self` is a view (`isView`), the actual HTMLBars `self` becomes
    the view's `context`. This is legacy semantics; components always
    use the component itself as the `this`.
  * If `self` is a view, two special locals are created: `view` and
    `controller`. These locals are legacy semantics.
  * If self has a `hasBoundController` property, it is coming from
    a legacy form of #with or #each
    (`{{#with something controller=someController}}`). This has
    the special effect of giving the child scope the supplied
    `controller` keyword, with an unrelated `self`. This is
    legacy functionality, as both the `view` and `controller`
    keywords have been deprecated.

  **IMPORTANT**: There are two places in Ember where the ambient
  controller is looked up. Both of those places use the presence
  of `scope.locals.view` to indicate that the controller lookup
  should be dynamic off of the ambient view. If `scope.locals.view`
  does not exist, the code assumes that it is inside of a top-level
  template (without a view) and uses the `self` itself as the
  controller. This means that if you remove `scope.locals.view`
  (perhaps because we are finally ready to shed the view keyword),
  there may be unexpected consequences on controller semantics.
  If this happens to you, I hope you find this comment. - YK & TD

  In practice, this means that with the exceptions of top-level
  view-less templates and the legacy `controller=foo` semantics,
  the controller hierarchy is managed dynamically by looking at
  the current view's `controller`.
*/

function Scope(parent) {
  this.self = null;
  this.blocks = {};
  this.component = null;
  this.view = null;
  this.attrs = null;
  this.locals = {};
  this.localPresent = {};
  this.overrideController = false;
  this.parent = parent;
}

let proto = Scope.prototype;

proto.getSelf = function() {
  return this.self || this.parent.getSelf();
};

proto.bindSelf = function(self) {
  this.self = self;
};

proto.getBlock = function(name) {
  return this.blocks[name] || this.parent.getBlock(name);
};

proto.bindBlock = function(name, block) {
  this.blocks[name] = block;
};

proto.getComponent = function() {
  return this.component || this.parent.getComponent();
};

proto.bindComponent = function(component) {
  this.component = component;
};

proto.getView = function() {
  return this.view || this.parent.getView();
};

proto.bindView = function(view) {
  this.view = view;
};

proto.getAttrs = function() {
  return this.attrs || this.parent.getAttrs();
};

proto.bindAttrs = function(attrs) {
  this.attrs = attrs;
};

proto.hasLocal = function(name) {
  return this.localPresent[name] || this.parent.hasLocal(name);
};

proto.hasOwnLocal = function(name) {
  return this.localPresent[name];
};

proto.getLocal = function(name) {
  return this.localPresent[name] ? this.locals[name] : this.parent.getLocal(name);
};

proto.bindLocal = function(name, value) {
  this.localPresent[name] = true;
  this.locals[name] = value;
};

const EMPTY = {
  getSelf() { return null; },
  getBlock(name) { return null; },
  getComponent() { return null; },
  getAttrs() { return null; },
  getLocal(name) { return null; }
};

export default function createFreshScope() {
  return new Scope(EMPTY);
}

export function createChildScope(parent) {
  return new Scope(parent);
}
