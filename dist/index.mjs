function noop() { }
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
        return definition[0](slot_ctx);
    }
}
function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
        : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
        const lets = definition[2](fn(dirty));
        if ($$scope.dirty === undefined) {
            return lets;
        }
        if (typeof lets === 'object') {
            const merged = [];
            const len = Math.max($$scope.dirty.length, lets.length);
            for (let i = 0; i < len; i += 1) {
                merged[i] = $$scope.dirty[i] | lets[i];
            }
            return merged;
        }
        return $$scope.dirty | lets;
    }
    return $$scope.dirty;
}
function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
    if (slot_changes) {
        const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
        slot.p(slot_context, slot_changes);
    }
}
function get_all_dirty_from_scope($$scope) {
    if ($$scope.ctx.length > 32) {
        const dirty = [];
        const length = $$scope.ctx.length / 32;
        for (let i = 0; i < length; i++) {
            dirty[i] = -1;
        }
        return dirty;
    }
    return -1;
}
function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}

let current_component;
function set_current_component(component) {
    current_component = component;
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();
let flushidx = 0; // Do *not* move this inside the flush() function
function flush() {
    const saved_component = current_component;
    do {
        // first, call beforeUpdate functions
        // and update components
        while (flushidx < dirty_components.length) {
            const component = dirty_components[flushidx];
            flushidx++;
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        flushidx = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    seen_callbacks.clear();
    set_current_component(saved_component);
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor, customElement) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
    }
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false,
        root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor, options.customElement);
        flush();
    }
    set_current_component(parent_component);
}
/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

/* node_modules/svelte-feather-icons/src/icons/AlertTriangleIcon.svelte generated by Svelte v3.48.0 */

function create_fragment$f(ctx) {
	let svg;
	let path;
	let line0;
	let line1;
	let svg_class_value;

	return {
		c() {
			svg = svg_element("svg");
			path = svg_element("path");
			line0 = svg_element("line");
			line1 = svg_element("line");
			attr(path, "d", "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z");
			attr(line0, "x1", "12");
			attr(line0, "y1", "9");
			attr(line0, "x2", "12");
			attr(line0, "y2", "13");
			attr(line1, "x1", "12");
			attr(line1, "y1", "17");
			attr(line1, "x2", "12.01");
			attr(line1, "y2", "17");
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg, "width", /*size*/ ctx[0]);
			attr(svg, "height", /*size*/ ctx[0]);
			attr(svg, "fill", "none");
			attr(svg, "viewBox", "0 0 24 24");
			attr(svg, "stroke", "currentColor");
			attr(svg, "stroke-width", /*strokeWidth*/ ctx[1]);
			attr(svg, "stroke-linecap", "round");
			attr(svg, "stroke-linejoin", "round");
			attr(svg, "class", svg_class_value = "feather feather-alert-triangle " + /*customClass*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, path);
			append(svg, line0);
			append(svg, line1);
		},
		p(ctx, [dirty]) {
			if (dirty & /*size*/ 1) {
				attr(svg, "width", /*size*/ ctx[0]);
			}

			if (dirty & /*size*/ 1) {
				attr(svg, "height", /*size*/ ctx[0]);
			}

			if (dirty & /*strokeWidth*/ 2) {
				attr(svg, "stroke-width", /*strokeWidth*/ ctx[1]);
			}

			if (dirty & /*customClass*/ 4 && svg_class_value !== (svg_class_value = "feather feather-alert-triangle " + /*customClass*/ ctx[2])) {
				attr(svg, "class", svg_class_value);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

function instance$f($$self, $$props, $$invalidate) {
	let { size = "24" } = $$props;
	let { strokeWidth = 2 } = $$props;
	let { class: customClass = "" } = $$props;

	if (size !== "100%") {
		size = size.slice(-1) === 'x'
		? size.slice(0, size.length - 1) + 'em'
		: parseInt(size) + 'px';
	}

	$$self.$$set = $$props => {
		if ('size' in $$props) $$invalidate(0, size = $$props.size);
		if ('strokeWidth' in $$props) $$invalidate(1, strokeWidth = $$props.strokeWidth);
		if ('class' in $$props) $$invalidate(2, customClass = $$props.class);
	};

	return [size, strokeWidth, customClass];
}

class AlertTriangleIcon extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$f, create_fragment$f, safe_not_equal, { size: 0, strokeWidth: 1, class: 2 });
	}
}

/* node_modules/svelte-feather-icons/src/icons/CheckIcon.svelte generated by Svelte v3.48.0 */

function create_fragment$e(ctx) {
	let svg;
	let polyline;
	let svg_class_value;

	return {
		c() {
			svg = svg_element("svg");
			polyline = svg_element("polyline");
			attr(polyline, "points", "20 6 9 17 4 12");
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg, "width", /*size*/ ctx[0]);
			attr(svg, "height", /*size*/ ctx[0]);
			attr(svg, "fill", "none");
			attr(svg, "viewBox", "0 0 24 24");
			attr(svg, "stroke", "currentColor");
			attr(svg, "stroke-width", /*strokeWidth*/ ctx[1]);
			attr(svg, "stroke-linecap", "round");
			attr(svg, "stroke-linejoin", "round");
			attr(svg, "class", svg_class_value = "feather feather-check " + /*customClass*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, polyline);
		},
		p(ctx, [dirty]) {
			if (dirty & /*size*/ 1) {
				attr(svg, "width", /*size*/ ctx[0]);
			}

			if (dirty & /*size*/ 1) {
				attr(svg, "height", /*size*/ ctx[0]);
			}

			if (dirty & /*strokeWidth*/ 2) {
				attr(svg, "stroke-width", /*strokeWidth*/ ctx[1]);
			}

			if (dirty & /*customClass*/ 4 && svg_class_value !== (svg_class_value = "feather feather-check " + /*customClass*/ ctx[2])) {
				attr(svg, "class", svg_class_value);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

function instance$e($$self, $$props, $$invalidate) {
	let { size = "24" } = $$props;
	let { strokeWidth = 2 } = $$props;
	let { class: customClass = "" } = $$props;

	if (size !== "100%") {
		size = size.slice(-1) === 'x'
		? size.slice(0, size.length - 1) + 'em'
		: parseInt(size) + 'px';
	}

	$$self.$$set = $$props => {
		if ('size' in $$props) $$invalidate(0, size = $$props.size);
		if ('strokeWidth' in $$props) $$invalidate(1, strokeWidth = $$props.strokeWidth);
		if ('class' in $$props) $$invalidate(2, customClass = $$props.class);
	};

	return [size, strokeWidth, customClass];
}

class CheckIcon extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$e, create_fragment$e, safe_not_equal, { size: 0, strokeWidth: 1, class: 2 });
	}
}

/* node_modules/svelte-feather-icons/src/icons/InfoIcon.svelte generated by Svelte v3.48.0 */

function create_fragment$d(ctx) {
	let svg;
	let circle;
	let line0;
	let line1;
	let svg_class_value;

	return {
		c() {
			svg = svg_element("svg");
			circle = svg_element("circle");
			line0 = svg_element("line");
			line1 = svg_element("line");
			attr(circle, "cx", "12");
			attr(circle, "cy", "12");
			attr(circle, "r", "10");
			attr(line0, "x1", "12");
			attr(line0, "y1", "16");
			attr(line0, "x2", "12");
			attr(line0, "y2", "12");
			attr(line1, "x1", "12");
			attr(line1, "y1", "8");
			attr(line1, "x2", "12.01");
			attr(line1, "y2", "8");
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg, "width", /*size*/ ctx[0]);
			attr(svg, "height", /*size*/ ctx[0]);
			attr(svg, "fill", "none");
			attr(svg, "viewBox", "0 0 24 24");
			attr(svg, "stroke", "currentColor");
			attr(svg, "stroke-width", /*strokeWidth*/ ctx[1]);
			attr(svg, "stroke-linecap", "round");
			attr(svg, "stroke-linejoin", "round");
			attr(svg, "class", svg_class_value = "feather feather-info " + /*customClass*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, circle);
			append(svg, line0);
			append(svg, line1);
		},
		p(ctx, [dirty]) {
			if (dirty & /*size*/ 1) {
				attr(svg, "width", /*size*/ ctx[0]);
			}

			if (dirty & /*size*/ 1) {
				attr(svg, "height", /*size*/ ctx[0]);
			}

			if (dirty & /*strokeWidth*/ 2) {
				attr(svg, "stroke-width", /*strokeWidth*/ ctx[1]);
			}

			if (dirty & /*customClass*/ 4 && svg_class_value !== (svg_class_value = "feather feather-info " + /*customClass*/ ctx[2])) {
				attr(svg, "class", svg_class_value);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

function instance$d($$self, $$props, $$invalidate) {
	let { size = "24" } = $$props;
	let { strokeWidth = 2 } = $$props;
	let { class: customClass = "" } = $$props;

	if (size !== "100%") {
		size = size.slice(-1) === 'x'
		? size.slice(0, size.length - 1) + 'em'
		: parseInt(size) + 'px';
	}

	$$self.$$set = $$props => {
		if ('size' in $$props) $$invalidate(0, size = $$props.size);
		if ('strokeWidth' in $$props) $$invalidate(1, strokeWidth = $$props.strokeWidth);
		if ('class' in $$props) $$invalidate(2, customClass = $$props.class);
	};

	return [size, strokeWidth, customClass];
}

class InfoIcon extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$d, create_fragment$d, safe_not_equal, { size: 0, strokeWidth: 1, class: 2 });
	}
}

/* node_modules/svelte-feather-icons/src/icons/UserIcon.svelte generated by Svelte v3.48.0 */

function create_fragment$c(ctx) {
	let svg;
	let path;
	let circle;
	let svg_class_value;

	return {
		c() {
			svg = svg_element("svg");
			path = svg_element("path");
			circle = svg_element("circle");
			attr(path, "d", "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2");
			attr(circle, "cx", "12");
			attr(circle, "cy", "7");
			attr(circle, "r", "4");
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg, "width", /*size*/ ctx[0]);
			attr(svg, "height", /*size*/ ctx[0]);
			attr(svg, "fill", "none");
			attr(svg, "viewBox", "0 0 24 24");
			attr(svg, "stroke", "currentColor");
			attr(svg, "stroke-width", /*strokeWidth*/ ctx[1]);
			attr(svg, "stroke-linecap", "round");
			attr(svg, "stroke-linejoin", "round");
			attr(svg, "class", svg_class_value = "feather feather-user " + /*customClass*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, path);
			append(svg, circle);
		},
		p(ctx, [dirty]) {
			if (dirty & /*size*/ 1) {
				attr(svg, "width", /*size*/ ctx[0]);
			}

			if (dirty & /*size*/ 1) {
				attr(svg, "height", /*size*/ ctx[0]);
			}

			if (dirty & /*strokeWidth*/ 2) {
				attr(svg, "stroke-width", /*strokeWidth*/ ctx[1]);
			}

			if (dirty & /*customClass*/ 4 && svg_class_value !== (svg_class_value = "feather feather-user " + /*customClass*/ ctx[2])) {
				attr(svg, "class", svg_class_value);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

function instance$c($$self, $$props, $$invalidate) {
	let { size = "24" } = $$props;
	let { strokeWidth = 2 } = $$props;
	let { class: customClass = "" } = $$props;

	if (size !== "100%") {
		size = size.slice(-1) === 'x'
		? size.slice(0, size.length - 1) + 'em'
		: parseInt(size) + 'px';
	}

	$$self.$$set = $$props => {
		if ('size' in $$props) $$invalidate(0, size = $$props.size);
		if ('strokeWidth' in $$props) $$invalidate(1, strokeWidth = $$props.strokeWidth);
		if ('class' in $$props) $$invalidate(2, customClass = $$props.class);
	};

	return [size, strokeWidth, customClass];
}

class UserIcon extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$c, create_fragment$c, safe_not_equal, { size: 0, strokeWidth: 1, class: 2 });
	}
}

/* node_modules/svelte-feather-icons/src/icons/XCircleIcon.svelte generated by Svelte v3.48.0 */

function create_fragment$b(ctx) {
	let svg;
	let circle;
	let line0;
	let line1;
	let svg_class_value;

	return {
		c() {
			svg = svg_element("svg");
			circle = svg_element("circle");
			line0 = svg_element("line");
			line1 = svg_element("line");
			attr(circle, "cx", "12");
			attr(circle, "cy", "12");
			attr(circle, "r", "10");
			attr(line0, "x1", "15");
			attr(line0, "y1", "9");
			attr(line0, "x2", "9");
			attr(line0, "y2", "15");
			attr(line1, "x1", "9");
			attr(line1, "y1", "9");
			attr(line1, "x2", "15");
			attr(line1, "y2", "15");
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg, "width", /*size*/ ctx[0]);
			attr(svg, "height", /*size*/ ctx[0]);
			attr(svg, "fill", "none");
			attr(svg, "viewBox", "0 0 24 24");
			attr(svg, "stroke", "currentColor");
			attr(svg, "stroke-width", /*strokeWidth*/ ctx[1]);
			attr(svg, "stroke-linecap", "round");
			attr(svg, "stroke-linejoin", "round");
			attr(svg, "class", svg_class_value = "feather feather-x-circle " + /*customClass*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, circle);
			append(svg, line0);
			append(svg, line1);
		},
		p(ctx, [dirty]) {
			if (dirty & /*size*/ 1) {
				attr(svg, "width", /*size*/ ctx[0]);
			}

			if (dirty & /*size*/ 1) {
				attr(svg, "height", /*size*/ ctx[0]);
			}

			if (dirty & /*strokeWidth*/ 2) {
				attr(svg, "stroke-width", /*strokeWidth*/ ctx[1]);
			}

			if (dirty & /*customClass*/ 4 && svg_class_value !== (svg_class_value = "feather feather-x-circle " + /*customClass*/ ctx[2])) {
				attr(svg, "class", svg_class_value);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

function instance$b($$self, $$props, $$invalidate) {
	let { size = "24" } = $$props;
	let { strokeWidth = 2 } = $$props;
	let { class: customClass = "" } = $$props;

	if (size !== "100%") {
		size = size.slice(-1) === 'x'
		? size.slice(0, size.length - 1) + 'em'
		: parseInt(size) + 'px';
	}

	$$self.$$set = $$props => {
		if ('size' in $$props) $$invalidate(0, size = $$props.size);
		if ('strokeWidth' in $$props) $$invalidate(1, strokeWidth = $$props.strokeWidth);
		if ('class' in $$props) $$invalidate(2, customClass = $$props.class);
	};

	return [size, strokeWidth, customClass];
}

class XCircleIcon extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$b, create_fragment$b, safe_not_equal, { size: 0, strokeWidth: 1, class: 2 });
	}
}

/* node_modules/svelte-feather-icons/src/icons/XIcon.svelte generated by Svelte v3.48.0 */

function create_fragment$a(ctx) {
	let svg;
	let line0;
	let line1;
	let svg_class_value;

	return {
		c() {
			svg = svg_element("svg");
			line0 = svg_element("line");
			line1 = svg_element("line");
			attr(line0, "x1", "18");
			attr(line0, "y1", "6");
			attr(line0, "x2", "6");
			attr(line0, "y2", "18");
			attr(line1, "x1", "6");
			attr(line1, "y1", "6");
			attr(line1, "x2", "18");
			attr(line1, "y2", "18");
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg, "width", /*size*/ ctx[0]);
			attr(svg, "height", /*size*/ ctx[0]);
			attr(svg, "fill", "none");
			attr(svg, "viewBox", "0 0 24 24");
			attr(svg, "stroke", "currentColor");
			attr(svg, "stroke-width", /*strokeWidth*/ ctx[1]);
			attr(svg, "stroke-linecap", "round");
			attr(svg, "stroke-linejoin", "round");
			attr(svg, "class", svg_class_value = "feather feather-x " + /*customClass*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, line0);
			append(svg, line1);
		},
		p(ctx, [dirty]) {
			if (dirty & /*size*/ 1) {
				attr(svg, "width", /*size*/ ctx[0]);
			}

			if (dirty & /*size*/ 1) {
				attr(svg, "height", /*size*/ ctx[0]);
			}

			if (dirty & /*strokeWidth*/ 2) {
				attr(svg, "stroke-width", /*strokeWidth*/ ctx[1]);
			}

			if (dirty & /*customClass*/ 4 && svg_class_value !== (svg_class_value = "feather feather-x " + /*customClass*/ ctx[2])) {
				attr(svg, "class", svg_class_value);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

function instance$a($$self, $$props, $$invalidate) {
	let { size = "24" } = $$props;
	let { strokeWidth = 2 } = $$props;
	let { class: customClass = "" } = $$props;

	if (size !== "100%") {
		size = size.slice(-1) === 'x'
		? size.slice(0, size.length - 1) + 'em'
		: parseInt(size) + 'px';
	}

	$$self.$$set = $$props => {
		if ('size' in $$props) $$invalidate(0, size = $$props.size);
		if ('strokeWidth' in $$props) $$invalidate(1, strokeWidth = $$props.strokeWidth);
		if ('class' in $$props) $$invalidate(2, customClass = $$props.class);
	};

	return [size, strokeWidth, customClass];
}

class XIcon extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$a, create_fragment$a, safe_not_equal, { size: 0, strokeWidth: 1, class: 2 });
	}
}

/* src/Alert.svelte generated by Svelte v3.48.0 */

const get_description_slot_changes_3 = dirty => ({});
const get_description_slot_context_3 = ctx => ({});
const get_title_slot_changes_3 = dirty => ({});
const get_title_slot_context_3 = ctx => ({});
const get_description_slot_changes_2 = dirty => ({});
const get_description_slot_context_2 = ctx => ({});
const get_title_slot_changes_2 = dirty => ({});
const get_title_slot_context_2 = ctx => ({});
const get_description_slot_changes_1 = dirty => ({});
const get_description_slot_context_1 = ctx => ({});
const get_title_slot_changes_1 = dirty => ({});
const get_title_slot_context_1 = ctx => ({});
const get_description_slot_changes$2 = dirty => ({});
const get_description_slot_context$2 = ctx => ({});
const get_title_slot_changes$1 = dirty => ({});
const get_title_slot_context$1 = ctx => ({});

// (17:0) {#if visible == true}
function create_if_block$6(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block_1$4, create_if_block_4$3, create_if_block_7$2, create_if_block_10$1];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*variant*/ ctx[0] == "success") return 0;
		if (/*variant*/ ctx[0] == "danger") return 1;
		if (/*variant*/ ctx[0] == "info") return 2;
		if (/*variant*/ ctx[0] == "warning") return 3;
		return -1;
	}

	if (~(current_block_type_index = select_block_type(ctx))) {
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	}

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (~current_block_type_index) {
				if_blocks[current_block_type_index].m(target, anchor);
			}

			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if (~current_block_type_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				}
			} else {
				if (if_block) {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
				}

				if (~current_block_type_index) {
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				} else {
					if_block = null;
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (~current_block_type_index) {
				if_blocks[current_block_type_index].d(detaching);
			}

			if (detaching) detach(if_block_anchor);
		}
	};
}

// (108:33) 
function create_if_block_10$1(ctx) {
	let div1;
	let span2;
	let t0;
	let div0;
	let span0;
	let t1;
	let span1;
	let t2;
	let current;
	let if_block0 = /*withIcon*/ ctx[2] == true && create_if_block_12();
	const title_slot_template = /*#slots*/ ctx[5].title;
	const title_slot = create_slot(title_slot_template, ctx, /*$$scope*/ ctx[4], get_title_slot_context_3);
	const description_slot_template = /*#slots*/ ctx[5].description;
	const description_slot = create_slot(description_slot_template, ctx, /*$$scope*/ ctx[4], get_description_slot_context_3);
	let if_block1 = /*closable*/ ctx[1] == true && create_if_block_11$1(ctx);

	return {
		c() {
			div1 = element("div");
			span2 = element("span");
			if (if_block0) if_block0.c();
			t0 = space();
			div0 = element("div");
			span0 = element("span");
			if (title_slot) title_slot.c();
			t1 = space();
			span1 = element("span");
			if (description_slot) description_slot.c();
			t2 = space();
			if (if_block1) if_block1.c();
			attr(span0, "class", "m-0 " + titleSize + " font-medium text-orange-1000");
			attr(span1, "class", "mt-2 text-sm text-orange-900");
			attr(div0, "class", "w-10/12 flex flex-col gap-1.5");
			attr(span2, "class", "flex");
			attr(div1, "class", "rounded-md p-4 bg-orange-300 text-orange-600");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, span2);
			if (if_block0) if_block0.m(span2, null);
			append(span2, t0);
			append(span2, div0);
			append(div0, span0);

			if (title_slot) {
				title_slot.m(span0, null);
			}

			append(div0, t1);
			append(div0, span1);

			if (description_slot) {
				description_slot.m(span1, null);
			}

			append(span2, t2);
			if (if_block1) if_block1.m(span2, null);
			current = true;
		},
		p(ctx, dirty) {
			if (/*withIcon*/ ctx[2] == true) {
				if (if_block0) {
					if (dirty & /*withIcon*/ 4) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_12();
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(span2, t0);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (title_slot) {
				if (title_slot.p && (!current || dirty & /*$$scope*/ 16)) {
					update_slot_base(
						title_slot,
						title_slot_template,
						ctx,
						/*$$scope*/ ctx[4],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
						: get_slot_changes(title_slot_template, /*$$scope*/ ctx[4], dirty, get_title_slot_changes_3),
						get_title_slot_context_3
					);
				}
			}

			if (description_slot) {
				if (description_slot.p && (!current || dirty & /*$$scope*/ 16)) {
					update_slot_base(
						description_slot,
						description_slot_template,
						ctx,
						/*$$scope*/ ctx[4],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
						: get_slot_changes(description_slot_template, /*$$scope*/ ctx[4], dirty, get_description_slot_changes_3),
						get_description_slot_context_3
					);
				}
			}

			if (/*closable*/ ctx[1] == true) {
				if (if_block1) {
					if_block1.p(ctx, dirty);

					if (dirty & /*closable*/ 2) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block_11$1(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(span2, null);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(title_slot, local);
			transition_in(description_slot, local);
			transition_in(if_block1);
			current = true;
		},
		o(local) {
			transition_out(if_block0);
			transition_out(title_slot, local);
			transition_out(description_slot, local);
			transition_out(if_block1);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div1);
			if (if_block0) if_block0.d();
			if (title_slot) title_slot.d(detaching);
			if (description_slot) description_slot.d(detaching);
			if (if_block1) if_block1.d();
		}
	};
}

// (78:30) 
function create_if_block_7$2(ctx) {
	let div1;
	let span2;
	let t0;
	let div0;
	let span0;
	let t1;
	let span1;
	let t2;
	let current;
	let if_block0 = /*withIcon*/ ctx[2] == true && create_if_block_9$2();
	const title_slot_template = /*#slots*/ ctx[5].title;
	const title_slot = create_slot(title_slot_template, ctx, /*$$scope*/ ctx[4], get_title_slot_context_2);
	const description_slot_template = /*#slots*/ ctx[5].description;
	const description_slot = create_slot(description_slot_template, ctx, /*$$scope*/ ctx[4], get_description_slot_context_2);
	let if_block1 = /*closable*/ ctx[1] == true && create_if_block_8$2(ctx);

	return {
		c() {
			div1 = element("div");
			span2 = element("span");
			if (if_block0) if_block0.c();
			t0 = space();
			div0 = element("div");
			span0 = element("span");
			if (title_slot) title_slot.c();
			t1 = space();
			span1 = element("span");
			if (description_slot) description_slot.c();
			t2 = space();
			if (if_block1) if_block1.c();
			attr(span0, "class", "m-0 " + titleSize + " font-medium text-indigo-1000");
			attr(span1, "class", "mt-2 text-sm text-indigo-900");
			attr(div0, "class", "w-10/12 flex flex-col gap-1.5");
			attr(span2, "class", "flex");
			attr(div1, "class", "rounded-md p-4 bg-indigo-400 text-indigo-600");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, span2);
			if (if_block0) if_block0.m(span2, null);
			append(span2, t0);
			append(span2, div0);
			append(div0, span0);

			if (title_slot) {
				title_slot.m(span0, null);
			}

			append(div0, t1);
			append(div0, span1);

			if (description_slot) {
				description_slot.m(span1, null);
			}

			append(span2, t2);
			if (if_block1) if_block1.m(span2, null);
			current = true;
		},
		p(ctx, dirty) {
			if (/*withIcon*/ ctx[2] == true) {
				if (if_block0) {
					if (dirty & /*withIcon*/ 4) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_9$2();
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(span2, t0);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (title_slot) {
				if (title_slot.p && (!current || dirty & /*$$scope*/ 16)) {
					update_slot_base(
						title_slot,
						title_slot_template,
						ctx,
						/*$$scope*/ ctx[4],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
						: get_slot_changes(title_slot_template, /*$$scope*/ ctx[4], dirty, get_title_slot_changes_2),
						get_title_slot_context_2
					);
				}
			}

			if (description_slot) {
				if (description_slot.p && (!current || dirty & /*$$scope*/ 16)) {
					update_slot_base(
						description_slot,
						description_slot_template,
						ctx,
						/*$$scope*/ ctx[4],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
						: get_slot_changes(description_slot_template, /*$$scope*/ ctx[4], dirty, get_description_slot_changes_2),
						get_description_slot_context_2
					);
				}
			}

			if (/*closable*/ ctx[1] == true) {
				if (if_block1) {
					if_block1.p(ctx, dirty);

					if (dirty & /*closable*/ 2) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block_8$2(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(span2, null);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(title_slot, local);
			transition_in(description_slot, local);
			transition_in(if_block1);
			current = true;
		},
		o(local) {
			transition_out(if_block0);
			transition_out(title_slot, local);
			transition_out(description_slot, local);
			transition_out(if_block1);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div1);
			if (if_block0) if_block0.d();
			if (title_slot) title_slot.d(detaching);
			if (description_slot) description_slot.d(detaching);
			if (if_block1) if_block1.d();
		}
	};
}

// (48:32) 
function create_if_block_4$3(ctx) {
	let div1;
	let span2;
	let t0;
	let div0;
	let span0;
	let t1;
	let span1;
	let t2;
	let current;
	let if_block0 = /*withIcon*/ ctx[2] == true && create_if_block_6$2();
	const title_slot_template = /*#slots*/ ctx[5].title;
	const title_slot = create_slot(title_slot_template, ctx, /*$$scope*/ ctx[4], get_title_slot_context_1);
	const description_slot_template = /*#slots*/ ctx[5].description;
	const description_slot = create_slot(description_slot_template, ctx, /*$$scope*/ ctx[4], get_description_slot_context_1);
	let if_block1 = /*closable*/ ctx[1] == true && create_if_block_5$2(ctx);

	return {
		c() {
			div1 = element("div");
			span2 = element("span");
			if (if_block0) if_block0.c();
			t0 = space();
			div0 = element("div");
			span0 = element("span");
			if (title_slot) title_slot.c();
			t1 = space();
			span1 = element("span");
			if (description_slot) description_slot.c();
			t2 = space();
			if (if_block1) if_block1.c();
			attr(span0, "class", "m-0 " + titleSize + " font-medium text-red-1000");
			attr(span1, "class", "mt-2 text-sm text-red-900");
			attr(div0, "class", "w-10/12 flex flex-col gap-1.5");
			attr(span2, "class", "flex");
			attr(div1, "class", "rounded-md p-4 bg-red-400 text-red-600");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, span2);
			if (if_block0) if_block0.m(span2, null);
			append(span2, t0);
			append(span2, div0);
			append(div0, span0);

			if (title_slot) {
				title_slot.m(span0, null);
			}

			append(div0, t1);
			append(div0, span1);

			if (description_slot) {
				description_slot.m(span1, null);
			}

			append(span2, t2);
			if (if_block1) if_block1.m(span2, null);
			current = true;
		},
		p(ctx, dirty) {
			if (/*withIcon*/ ctx[2] == true) {
				if (if_block0) {
					if (dirty & /*withIcon*/ 4) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_6$2();
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(span2, t0);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (title_slot) {
				if (title_slot.p && (!current || dirty & /*$$scope*/ 16)) {
					update_slot_base(
						title_slot,
						title_slot_template,
						ctx,
						/*$$scope*/ ctx[4],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
						: get_slot_changes(title_slot_template, /*$$scope*/ ctx[4], dirty, get_title_slot_changes_1),
						get_title_slot_context_1
					);
				}
			}

			if (description_slot) {
				if (description_slot.p && (!current || dirty & /*$$scope*/ 16)) {
					update_slot_base(
						description_slot,
						description_slot_template,
						ctx,
						/*$$scope*/ ctx[4],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
						: get_slot_changes(description_slot_template, /*$$scope*/ ctx[4], dirty, get_description_slot_changes_1),
						get_description_slot_context_1
					);
				}
			}

			if (/*closable*/ ctx[1] == true) {
				if (if_block1) {
					if_block1.p(ctx, dirty);

					if (dirty & /*closable*/ 2) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block_5$2(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(span2, null);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(title_slot, local);
			transition_in(description_slot, local);
			transition_in(if_block1);
			current = true;
		},
		o(local) {
			transition_out(if_block0);
			transition_out(title_slot, local);
			transition_out(description_slot, local);
			transition_out(if_block1);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div1);
			if (if_block0) if_block0.d();
			if (title_slot) title_slot.d(detaching);
			if (description_slot) description_slot.d(detaching);
			if (if_block1) if_block1.d();
		}
	};
}

// (18:2) {#if variant == "success"}
function create_if_block_1$4(ctx) {
	let div1;
	let span2;
	let t0;
	let div0;
	let span0;
	let t1;
	let span1;
	let t2;
	let current;
	let if_block0 = /*withIcon*/ ctx[2] == true && create_if_block_3$3();
	const title_slot_template = /*#slots*/ ctx[5].title;
	const title_slot = create_slot(title_slot_template, ctx, /*$$scope*/ ctx[4], get_title_slot_context$1);
	const description_slot_template = /*#slots*/ ctx[5].description;
	const description_slot = create_slot(description_slot_template, ctx, /*$$scope*/ ctx[4], get_description_slot_context$2);
	let if_block1 = /*closable*/ ctx[1] == true && create_if_block_2$3(ctx);

	return {
		c() {
			div1 = element("div");
			span2 = element("span");
			if (if_block0) if_block0.c();
			t0 = space();
			div0 = element("div");
			span0 = element("span");
			if (title_slot) title_slot.c();
			t1 = space();
			span1 = element("span");
			if (description_slot) description_slot.c();
			t2 = space();
			if (if_block1) if_block1.c();
			attr(span0, "class", "m-0 " + titleSize + " font-medium");
			attr(span1, "class", "mt-2 text-sm text-green-900");
			attr(div0, "class", "w-10/12 flex flex-col gap-1");
			attr(span2, "class", "flex");
			attr(div1, "class", "rounded-md p-4 bg-green-300 text-green-1000");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, span2);
			if (if_block0) if_block0.m(span2, null);
			append(span2, t0);
			append(span2, div0);
			append(div0, span0);

			if (title_slot) {
				title_slot.m(span0, null);
			}

			append(div0, t1);
			append(div0, span1);

			if (description_slot) {
				description_slot.m(span1, null);
			}

			append(span2, t2);
			if (if_block1) if_block1.m(span2, null);
			current = true;
		},
		p(ctx, dirty) {
			if (/*withIcon*/ ctx[2] == true) {
				if (if_block0) {
					if (dirty & /*withIcon*/ 4) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_3$3();
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(span2, t0);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (title_slot) {
				if (title_slot.p && (!current || dirty & /*$$scope*/ 16)) {
					update_slot_base(
						title_slot,
						title_slot_template,
						ctx,
						/*$$scope*/ ctx[4],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
						: get_slot_changes(title_slot_template, /*$$scope*/ ctx[4], dirty, get_title_slot_changes$1),
						get_title_slot_context$1
					);
				}
			}

			if (description_slot) {
				if (description_slot.p && (!current || dirty & /*$$scope*/ 16)) {
					update_slot_base(
						description_slot,
						description_slot_template,
						ctx,
						/*$$scope*/ ctx[4],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
						: get_slot_changes(description_slot_template, /*$$scope*/ ctx[4], dirty, get_description_slot_changes$2),
						get_description_slot_context$2
					);
				}
			}

			if (/*closable*/ ctx[1] == true) {
				if (if_block1) {
					if_block1.p(ctx, dirty);

					if (dirty & /*closable*/ 2) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block_2$3(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(span2, null);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(title_slot, local);
			transition_in(description_slot, local);
			transition_in(if_block1);
			current = true;
		},
		o(local) {
			transition_out(if_block0);
			transition_out(title_slot, local);
			transition_out(description_slot, local);
			transition_out(if_block1);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div1);
			if (if_block0) if_block0.d();
			if (title_slot) title_slot.d(detaching);
			if (description_slot) description_slot.d(detaching);
			if (if_block1) if_block1.d();
		}
	};
}

// (111:8) {#if withIcon == true}
function create_if_block_12(ctx) {
	let div;
	let alerttriangleicon;
	let current;
	alerttriangleicon = new AlertTriangleIcon({});

	return {
		c() {
			div = element("div");
			create_component(alerttriangleicon.$$.fragment);
			attr(div, "class", "w-1/12 text-orange-1000");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(alerttriangleicon, div, null);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(alerttriangleicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(alerttriangleicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(alerttriangleicon);
		}
	};
}

// (124:8) {#if closable == true}
function create_if_block_11$1(ctx) {
	let div;
	let span;
	let xicon;
	let current;
	let mounted;
	let dispose;
	xicon = new XIcon({ props: { size: "24" } });

	return {
		c() {
			div = element("div");
			span = element("span");
			create_component(xicon.$$.fragment);
			attr(span, "class", "text-orange-800 hover:bg-orange-600 hover:bg-opacity-10 cursor-pointer inline-flex transition ease-in-out duration-200 bg-transparent border-transparent rounded-md p-1 focus:outline-none");
			attr(div, "class", "ml-auto w-15");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, span);
			mount_component(xicon, span, null);
			current = true;

			if (!mounted) {
				dispose = listen(span, "click", /*click_handler_3*/ ctx[9]);
				mounted = true;
			}
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(xicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(xicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(xicon);
			mounted = false;
			dispose();
		}
	};
}

// (81:8) {#if withIcon == true}
function create_if_block_9$2(ctx) {
	let div;
	let infoicon;
	let current;
	infoicon = new InfoIcon({});

	return {
		c() {
			div = element("div");
			create_component(infoicon.$$.fragment);
			attr(div, "class", "w-1/12 text-indigo-800");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(infoicon, div, null);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(infoicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(infoicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(infoicon);
		}
	};
}

// (94:8) {#if closable == true}
function create_if_block_8$2(ctx) {
	let div;
	let span;
	let xicon;
	let current;
	let mounted;
	let dispose;
	xicon = new XIcon({ props: { size: "24" } });

	return {
		c() {
			div = element("div");
			span = element("span");
			create_component(xicon.$$.fragment);
			attr(span, "class", "text-indigo-800 hover:bg-indigo-600 hover:bg-opacity-10 cursor-pointer inline-flex transition ease-in-out duration-200 bg-transparent border-transparent rounded-md p-1 focus:outline-none");
			attr(div, "class", "ml-auto w-15");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, span);
			mount_component(xicon, span, null);
			current = true;

			if (!mounted) {
				dispose = listen(span, "click", /*click_handler_2*/ ctx[8]);
				mounted = true;
			}
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(xicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(xicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(xicon);
			mounted = false;
			dispose();
		}
	};
}

// (51:8) {#if withIcon == true}
function create_if_block_6$2(ctx) {
	let div;
	let xcircleicon;
	let current;
	xcircleicon = new XCircleIcon({});

	return {
		c() {
			div = element("div");
			create_component(xcircleicon.$$.fragment);
			attr(div, "class", "w-1/12 text-red-800");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(xcircleicon, div, null);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(xcircleicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(xcircleicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(xcircleicon);
		}
	};
}

// (64:8) {#if closable == true}
function create_if_block_5$2(ctx) {
	let div;
	let span;
	let xicon;
	let current;
	let mounted;
	let dispose;
	xicon = new XIcon({ props: { size: "24" } });

	return {
		c() {
			div = element("div");
			span = element("span");
			create_component(xicon.$$.fragment);
			attr(span, "class", "text-red-800 hover:bg-red-600 hover:bg-opacity-10 cursor-pointer inline-flex transition ease-in-out duration-200 bg-transparent border-transparent rounded-md p-1 focus:outline-none");
			attr(div, "class", "ml-auto w-15");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, span);
			mount_component(xicon, span, null);
			current = true;

			if (!mounted) {
				dispose = listen(span, "click", /*click_handler_1*/ ctx[7]);
				mounted = true;
			}
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(xicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(xicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(xicon);
			mounted = false;
			dispose();
		}
	};
}

// (21:8) {#if withIcon == true}
function create_if_block_3$3(ctx) {
	let div;
	let checkicon;
	let current;
	checkicon = new CheckIcon({});

	return {
		c() {
			div = element("div");
			create_component(checkicon.$$.fragment);
			attr(div, "class", "w-1/12");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(checkicon, div, null);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(checkicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(checkicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(checkicon);
		}
	};
}

// (34:8) {#if closable == true}
function create_if_block_2$3(ctx) {
	let div;
	let span;
	let xicon;
	let current;
	let mounted;
	let dispose;
	xicon = new XIcon({ props: { size: "24" } });

	return {
		c() {
			div = element("div");
			span = element("span");
			create_component(xicon.$$.fragment);
			attr(span, "class", "ml-auto text-brand-900 hover:bg-green-600 hover:bg-opacity-10 cursor-pointer inline-flex transition ease-in-out duration-200 bg-transparent border-transparent rounded-md p-1 focus:outline-none");
			attr(div, "class", "ml-auto w-15");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, span);
			mount_component(xicon, span, null);
			current = true;

			if (!mounted) {
				dispose = listen(span, "click", /*click_handler*/ ctx[6]);
				mounted = true;
			}
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(xicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(xicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(xicon);
			mounted = false;
			dispose();
		}
	};
}

function create_fragment$9(ctx) {
	let if_block_anchor;
	let current;
	let if_block = /*visible*/ ctx[3] == true && create_if_block$6(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*visible*/ ctx[3] == true) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*visible*/ 8) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$6(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

let titleSize = "text-xl";

function instance$9($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	let { variant } = $$props;
	let { closable } = $$props;
	let { withIcon } = $$props;
	let visible = true;

	const click_handler = () => {
		$$invalidate(3, visible = false);
	};

	const click_handler_1 = () => {
		$$invalidate(3, visible = false);
	};

	const click_handler_2 = () => {
		$$invalidate(3, visible = false);
	};

	const click_handler_3 = () => {
		$$invalidate(3, visible = false);
	};

	$$self.$$set = $$props => {
		if ('variant' in $$props) $$invalidate(0, variant = $$props.variant);
		if ('closable' in $$props) $$invalidate(1, closable = $$props.closable);
		if ('withIcon' in $$props) $$invalidate(2, withIcon = $$props.withIcon);
		if ('$$scope' in $$props) $$invalidate(4, $$scope = $$props.$$scope);
	};

	return [
		variant,
		closable,
		withIcon,
		visible,
		$$scope,
		slots,
		click_handler,
		click_handler_1,
		click_handler_2,
		click_handler_3
	];
}

class Alert extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$9, create_fragment$9, safe_not_equal, { variant: 0, closable: 1, withIcon: 2 });
	}
}

/* src/Input.svelte generated by Svelte v3.48.0 */

function create_else_block$3(ctx) {
	let input;
	let input_value_value;
	let input_class_value;
	let input_type_value;
	let input_placeholder_value;
	let mounted;
	let dispose;

	return {
		c() {
			input = element("input");
			input.disabled = /*disabled*/ ctx[7];
			attr(input, "style", /*style*/ ctx[5]);
			input.value = input_value_value = /*value*/ ctx[2] || "";
			attr(input, "class", input_class_value = "not_padded sbui-input--" + /*size*/ ctx[4] + " sbui_input sbui_input--" + (/*variant*/ ctx[3] || 'success') + " focus:outline-none block box-border pl-3 pr-3 py-2 w-full rounded-md shadow-sm text-sm border border-solid transition-all bg-white text-input-value-light border-input-border-light dark:bg-transparent dark:text-input-value-dark dark:border-input-border-dark" + " svelte-kek3r4");
			attr(input, "type", input_type_value = /*type*/ ctx[0] || "text");
			attr(input, "placeholder", input_placeholder_value = /*placeholder*/ ctx[1] || "");
		},
		m(target, anchor) {
			insert(target, input, anchor);

			if (!mounted) {
				dispose = [
					listen(input, "focus", function () {
						if (is_function(/*onfocus*/ ctx[8])) /*onfocus*/ ctx[8].apply(this, arguments);
					}),
					listen(input, "blur", function () {
						if (is_function(/*onblur*/ ctx[9])) /*onblur*/ ctx[9].apply(this, arguments);
					}),
					listen(input, "change", function () {
						if (is_function(/*onchange*/ ctx[10])) /*onchange*/ ctx[10].apply(this, arguments);
					}),
					listen(input, "keydown", function () {
						if (is_function(/*onkeydown*/ ctx[11])) /*onkeydown*/ ctx[11].apply(this, arguments);
					}),
					listen(input, "keyup", function () {
						if (is_function(/*onkeyup*/ ctx[12])) /*onkeyup*/ ctx[12].apply(this, arguments);
					})
				];

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (dirty & /*disabled*/ 128) {
				input.disabled = /*disabled*/ ctx[7];
			}

			if (dirty & /*style*/ 32) {
				attr(input, "style", /*style*/ ctx[5]);
			}

			if (dirty & /*value*/ 4 && input_value_value !== (input_value_value = /*value*/ ctx[2] || "") && input.value !== input_value_value) {
				input.value = input_value_value;
			}

			if (dirty & /*size, variant*/ 24 && input_class_value !== (input_class_value = "not_padded sbui-input--" + /*size*/ ctx[4] + " sbui_input sbui_input--" + (/*variant*/ ctx[3] || 'success') + " focus:outline-none block box-border pl-3 pr-3 py-2 w-full rounded-md shadow-sm text-sm border border-solid transition-all bg-white text-input-value-light border-input-border-light dark:bg-transparent dark:text-input-value-dark dark:border-input-border-dark" + " svelte-kek3r4")) {
				attr(input, "class", input_class_value);
			}

			if (dirty & /*type*/ 1 && input_type_value !== (input_type_value = /*type*/ ctx[0] || "text")) {
				attr(input, "type", input_type_value);
			}

			if (dirty & /*placeholder*/ 2 && input_placeholder_value !== (input_placeholder_value = /*placeholder*/ ctx[1] || "")) {
				attr(input, "placeholder", input_placeholder_value);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(input);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (18:2) {#if icon}
function create_if_block$5(ctx) {
	let switch_instance;
	let t;
	let input;
	let input_value_value;
	let input_class_value;
	let input_type_value;
	let input_placeholder_value;
	let current;
	let mounted;
	let dispose;
	var switch_value = /*icon*/ ctx[6];

	function switch_props(ctx) {
		return {
			props: { class: "transform absolute left-5" }
		};
	}

	if (switch_value) {
		switch_instance = new switch_value(switch_props());
	}

	return {
		c() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			t = space();
			input = element("input");
			attr(input, "style", /*style*/ ctx[5]);
			input.disabled = /*disabled*/ ctx[7];
			input.value = input_value_value = /*value*/ ctx[2] || "";
			attr(input, "class", input_class_value = "sbui-input--" + /*size*/ ctx[4] + " sbui_input pl-10 sbui_input--" + (/*variant*/ ctx[3] || 'success') + " focus:outline-none block box-border pr-3 py-2 w-full rounded-md shadow-sm text-sm border border-solid transition-all bg-white text-input-value-light border-input-border-light dark:bg-transparent dark:text-input-value-dark dark:border-input-border-dark" + " svelte-kek3r4");
			attr(input, "type", input_type_value = /*type*/ ctx[0] || "text");
			attr(input, "placeholder", input_placeholder_value = /*placeholder*/ ctx[1] || "");
		},
		m(target, anchor) {
			if (switch_instance) {
				mount_component(switch_instance, target, anchor);
			}

			insert(target, t, anchor);
			insert(target, input, anchor);
			current = true;

			if (!mounted) {
				dispose = [
					listen(input, "focus", function () {
						if (is_function(/*onfocus*/ ctx[8])) /*onfocus*/ ctx[8].apply(this, arguments);
					}),
					listen(input, "blur", function () {
						if (is_function(/*onblur*/ ctx[9])) /*onblur*/ ctx[9].apply(this, arguments);
					}),
					listen(input, "change", function () {
						if (is_function(/*onchange*/ ctx[10])) /*onchange*/ ctx[10].apply(this, arguments);
					}),
					listen(input, "keydown", function () {
						if (is_function(/*onkeydown*/ ctx[11])) /*onkeydown*/ ctx[11].apply(this, arguments);
					}),
					listen(input, "keyup", function () {
						if (is_function(/*onkeyup*/ ctx[12])) /*onkeyup*/ ctx[12].apply(this, arguments);
					})
				];

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (switch_value !== (switch_value = /*icon*/ ctx[6])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = new switch_value(switch_props());
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, t.parentNode, t);
				} else {
					switch_instance = null;
				}
			}

			if (!current || dirty & /*style*/ 32) {
				attr(input, "style", /*style*/ ctx[5]);
			}

			if (!current || dirty & /*disabled*/ 128) {
				input.disabled = /*disabled*/ ctx[7];
			}

			if (!current || dirty & /*value*/ 4 && input_value_value !== (input_value_value = /*value*/ ctx[2] || "") && input.value !== input_value_value) {
				input.value = input_value_value;
			}

			if (!current || dirty & /*size, variant*/ 24 && input_class_value !== (input_class_value = "sbui-input--" + /*size*/ ctx[4] + " sbui_input pl-10 sbui_input--" + (/*variant*/ ctx[3] || 'success') + " focus:outline-none block box-border pr-3 py-2 w-full rounded-md shadow-sm text-sm border border-solid transition-all bg-white text-input-value-light border-input-border-light dark:bg-transparent dark:text-input-value-dark dark:border-input-border-dark" + " svelte-kek3r4")) {
				attr(input, "class", input_class_value);
			}

			if (!current || dirty & /*type*/ 1 && input_type_value !== (input_type_value = /*type*/ ctx[0] || "text")) {
				attr(input, "type", input_type_value);
			}

			if (!current || dirty & /*placeholder*/ 2 && input_placeholder_value !== (input_placeholder_value = /*placeholder*/ ctx[1] || "")) {
				attr(input, "placeholder", input_placeholder_value);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (switch_instance) destroy_component(switch_instance, detaching);
			if (detaching) detach(t);
			if (detaching) detach(input);
			mounted = false;
			run_all(dispose);
		}
	};
}

function create_fragment$8(ctx) {
	let div;
	let current_block_type_index;
	let if_block;
	let current;
	const if_block_creators = [create_if_block$5, create_else_block$3];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*icon*/ ctx[6]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			div = element("div");
			if_block.c();
			attr(div, "class", "input-cont relative flex items-center");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if_blocks[current_block_type_index].m(div, null);
			current = true;
		},
		p(ctx, [dirty]) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(div, null);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if_blocks[current_block_type_index].d();
		}
	};
}

function instance$8($$self, $$props, $$invalidate) {
	let { type, placeholder, value, variant, size, style, icon, disabled, onfocus, onblur, onchange, onkeydown, onkeyup } = $$props;

	$$self.$$set = $$props => {
		if ('type' in $$props) $$invalidate(0, type = $$props.type);
		if ('placeholder' in $$props) $$invalidate(1, placeholder = $$props.placeholder);
		if ('value' in $$props) $$invalidate(2, value = $$props.value);
		if ('variant' in $$props) $$invalidate(3, variant = $$props.variant);
		if ('size' in $$props) $$invalidate(4, size = $$props.size);
		if ('style' in $$props) $$invalidate(5, style = $$props.style);
		if ('icon' in $$props) $$invalidate(6, icon = $$props.icon);
		if ('disabled' in $$props) $$invalidate(7, disabled = $$props.disabled);
		if ('onfocus' in $$props) $$invalidate(8, onfocus = $$props.onfocus);
		if ('onblur' in $$props) $$invalidate(9, onblur = $$props.onblur);
		if ('onchange' in $$props) $$invalidate(10, onchange = $$props.onchange);
		if ('onkeydown' in $$props) $$invalidate(11, onkeydown = $$props.onkeydown);
		if ('onkeyup' in $$props) $$invalidate(12, onkeyup = $$props.onkeyup);
	};

	return [
		type,
		placeholder,
		value,
		variant,
		size,
		style,
		icon,
		disabled,
		onfocus,
		onblur,
		onchange,
		onkeydown,
		onkeyup
	];
}

class Input extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
			type: 0,
			placeholder: 1,
			value: 2,
			variant: 3,
			size: 4,
			style: 5,
			icon: 6,
			disabled: 7,
			onfocus: 8,
			onblur: 9,
			onchange: 10,
			onkeydown: 11,
			onkeyup: 12
		});
	}
}

/* src/Badge.svelte generated by Svelte v3.48.0 */

function create_if_block$4(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;

	const if_block_creators = [
		create_if_block_1$3,
		create_if_block_3$2,
		create_if_block_5$1,
		create_if_block_7$1,
		create_else_block$2
	];

	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*variant*/ ctx[0] == "success") return 0;
		if (/*variant*/ ctx[0] == "danger") return 1;
		if (/*variant*/ ctx[0] == "warning") return 2;
		if (/*variant*/ ctx[0] == "info") return 3;
		return 4;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (72:2) {:else}
function create_else_block$2(ctx) {
	let span;
	let t;
	let span_class_value;
	let current;
	const default_slot_template = /*#slots*/ ctx[6].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);
	let if_block = /*closable*/ ctx[1] == true && create_if_block_9$1(ctx);

	return {
		c() {
			span = element("span");
			if (default_slot) default_slot.c();
			t = space();
			if (if_block) if_block.c();
			attr(span, "class", span_class_value = "" + (/*styles*/ ctx[3] + " bg-black bg-opacity-10"));
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (default_slot) {
				default_slot.m(span, null);
			}

			append(span, t);
			if (if_block) if_block.m(span, null);
			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[5],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
						null
					);
				}
			}

			if (/*closable*/ ctx[1] == true) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*closable*/ 2) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block_9$1(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(span, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if (!current || dirty & /*styles*/ 8 && span_class_value !== (span_class_value = "" + (/*styles*/ ctx[3] + " bg-black bg-opacity-10"))) {
				attr(span, "class", span_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (default_slot) default_slot.d(detaching);
			if (if_block) if_block.d();
		}
	};
}

// (58:30) 
function create_if_block_7$1(ctx) {
	let span;
	let t;
	let span_class_value;
	let current;
	const default_slot_template = /*#slots*/ ctx[6].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);
	let if_block = /*closable*/ ctx[1] == true && create_if_block_8$1(ctx);

	return {
		c() {
			span = element("span");
			if (default_slot) default_slot.c();
			t = space();
			if (if_block) if_block.c();
			attr(span, "class", span_class_value = "" + (/*styles*/ ctx[3] + " bg-indigo-300 text-indigo-1000"));
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (default_slot) {
				default_slot.m(span, null);
			}

			append(span, t);
			if (if_block) if_block.m(span, null);
			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[5],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
						null
					);
				}
			}

			if (/*closable*/ ctx[1] == true) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*closable*/ 2) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block_8$1(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(span, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if (!current || dirty & /*styles*/ 8 && span_class_value !== (span_class_value = "" + (/*styles*/ ctx[3] + " bg-indigo-300 text-indigo-1000"))) {
				attr(span, "class", span_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (default_slot) default_slot.d(detaching);
			if (if_block) if_block.d();
		}
	};
}

// (44:33) 
function create_if_block_5$1(ctx) {
	let span;
	let t;
	let span_class_value;
	let current;
	const default_slot_template = /*#slots*/ ctx[6].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);
	let if_block = /*closable*/ ctx[1] == true && create_if_block_6$1(ctx);

	return {
		c() {
			span = element("span");
			if (default_slot) default_slot.c();
			t = space();
			if (if_block) if_block.c();
			attr(span, "class", span_class_value = "" + (/*styles*/ ctx[3] + " bg-orange-300 text-orange-1000"));
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (default_slot) {
				default_slot.m(span, null);
			}

			append(span, t);
			if (if_block) if_block.m(span, null);
			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[5],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
						null
					);
				}
			}

			if (/*closable*/ ctx[1] == true) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*closable*/ 2) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block_6$1(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(span, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if (!current || dirty & /*styles*/ 8 && span_class_value !== (span_class_value = "" + (/*styles*/ ctx[3] + " bg-orange-300 text-orange-1000"))) {
				attr(span, "class", span_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (default_slot) default_slot.d(detaching);
			if (if_block) if_block.d();
		}
	};
}

// (30:32) 
function create_if_block_3$2(ctx) {
	let span;
	let t;
	let span_class_value;
	let current;
	const default_slot_template = /*#slots*/ ctx[6].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);
	let if_block = /*closable*/ ctx[1] == true && create_if_block_4$2(ctx);

	return {
		c() {
			span = element("span");
			if (default_slot) default_slot.c();
			t = space();
			if (if_block) if_block.c();
			attr(span, "class", span_class_value = "" + (/*styles*/ ctx[3] + " bg-red-300 text-red-1000"));
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (default_slot) {
				default_slot.m(span, null);
			}

			append(span, t);
			if (if_block) if_block.m(span, null);
			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[5],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
						null
					);
				}
			}

			if (/*closable*/ ctx[1] == true) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*closable*/ 2) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block_4$2(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(span, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if (!current || dirty & /*styles*/ 8 && span_class_value !== (span_class_value = "" + (/*styles*/ ctx[3] + " bg-red-300 text-red-1000"))) {
				attr(span, "class", span_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (default_slot) default_slot.d(detaching);
			if (if_block) if_block.d();
		}
	};
}

// (16:2) {#if variant == "success"}
function create_if_block_1$3(ctx) {
	let span;
	let t;
	let span_class_value;
	let current;
	const default_slot_template = /*#slots*/ ctx[6].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);
	let if_block = /*closable*/ ctx[1] == true && create_if_block_2$2(ctx);

	return {
		c() {
			span = element("span");
			if (default_slot) default_slot.c();
			t = space();
			if (if_block) if_block.c();
			attr(span, "class", span_class_value = "bg-green-300 text-green-1000 " + /*styles*/ ctx[3]);
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (default_slot) {
				default_slot.m(span, null);
			}

			append(span, t);
			if (if_block) if_block.m(span, null);
			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[5],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
						null
					);
				}
			}

			if (/*closable*/ ctx[1] == true) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*closable*/ 2) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block_2$2(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(span, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if (!current || dirty & /*styles*/ 8 && span_class_value !== (span_class_value = "bg-green-300 text-green-1000 " + /*styles*/ ctx[3])) {
				attr(span, "class", span_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (default_slot) default_slot.d(detaching);
			if (if_block) if_block.d();
		}
	};
}

// (75:6) {#if closable == true}
function create_if_block_9$1(ctx) {
	let span;
	let xicon;
	let current;
	let mounted;
	let dispose;
	xicon = new XIcon({ props: { size: "13" } });

	return {
		c() {
			span = element("span");
			create_component(xicon.$$.fragment);
			attr(span, "class", "rounded transition duration-200 ease-out hover:bg-green-400");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			mount_component(xicon, span, null);
			current = true;

			if (!mounted) {
				dispose = listen(span, "click", /*click_handler_4*/ ctx[11]);
				mounted = true;
			}
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(xicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(xicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			destroy_component(xicon);
			mounted = false;
			dispose();
		}
	};
}

// (61:6) {#if closable == true}
function create_if_block_8$1(ctx) {
	let span;
	let xicon;
	let current;
	let mounted;
	let dispose;
	xicon = new XIcon({ props: { size: "13" } });

	return {
		c() {
			span = element("span");
			create_component(xicon.$$.fragment);
			attr(span, "class", "rounded transition duration-200 ease-out hover:bg-green-400");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			mount_component(xicon, span, null);
			current = true;

			if (!mounted) {
				dispose = listen(span, "click", /*click_handler_3*/ ctx[10]);
				mounted = true;
			}
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(xicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(xicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			destroy_component(xicon);
			mounted = false;
			dispose();
		}
	};
}

// (47:6) {#if closable == true}
function create_if_block_6$1(ctx) {
	let span;
	let xicon;
	let current;
	let mounted;
	let dispose;
	xicon = new XIcon({ props: { size: "13" } });

	return {
		c() {
			span = element("span");
			create_component(xicon.$$.fragment);
			attr(span, "class", "rounded transition duration-200 ease-out hover:bg-green-400");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			mount_component(xicon, span, null);
			current = true;

			if (!mounted) {
				dispose = listen(span, "click", /*click_handler_2*/ ctx[9]);
				mounted = true;
			}
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(xicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(xicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			destroy_component(xicon);
			mounted = false;
			dispose();
		}
	};
}

// (33:6) {#if closable == true}
function create_if_block_4$2(ctx) {
	let span;
	let xicon;
	let current;
	let mounted;
	let dispose;
	xicon = new XIcon({ props: { size: "13" } });

	return {
		c() {
			span = element("span");
			create_component(xicon.$$.fragment);
			attr(span, "class", "rounded transition duration-200 ease-out hover:bg-green-400");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			mount_component(xicon, span, null);
			current = true;

			if (!mounted) {
				dispose = listen(span, "click", /*click_handler_1*/ ctx[8]);
				mounted = true;
			}
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(xicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(xicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			destroy_component(xicon);
			mounted = false;
			dispose();
		}
	};
}

// (19:6) {#if closable == true}
function create_if_block_2$2(ctx) {
	let span;
	let xicon;
	let current;
	let mounted;
	let dispose;
	xicon = new XIcon({ props: { size: "13" } });

	return {
		c() {
			span = element("span");
			create_component(xicon.$$.fragment);
			attr(span, "class", "rounded transition duration-200 ease-out hover:bg-green-400");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			mount_component(xicon, span, null);
			current = true;

			if (!mounted) {
				dispose = listen(span, "click", /*click_handler*/ ctx[7]);
				mounted = true;
			}
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(xicon.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(xicon.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			destroy_component(xicon);
			mounted = false;
			dispose();
		}
	};
}

function create_fragment$7(ctx) {
	let if_block_anchor;
	let current;
	let if_block = /*visible*/ ctx[2] && create_if_block$4(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*visible*/ ctx[2]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*visible*/ 4) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$4(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$7($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	let { variant } = $$props;
	let { closable } = $$props;
	let { large } = $$props;
	let visible = true;
	let styles = "inline-flex gap-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

	if (large == true) {
		styles += " px-3 py-0.5 rounded-full text-sm";
	}

	const click_handler = () => {
		$$invalidate(2, visible = false);
	};

	const click_handler_1 = () => {
		$$invalidate(2, visible = false);
	};

	const click_handler_2 = () => {
		$$invalidate(2, visible = false);
	};

	const click_handler_3 = () => {
		$$invalidate(2, visible = false);
	};

	const click_handler_4 = () => {
		$$invalidate(2, visible = false);
	};

	$$self.$$set = $$props => {
		if ('variant' in $$props) $$invalidate(0, variant = $$props.variant);
		if ('closable' in $$props) $$invalidate(1, closable = $$props.closable);
		if ('large' in $$props) $$invalidate(4, large = $$props.large);
		if ('$$scope' in $$props) $$invalidate(5, $$scope = $$props.$$scope);
	};

	return [
		variant,
		closable,
		visible,
		styles,
		large,
		$$scope,
		slots,
		click_handler,
		click_handler_1,
		click_handler_2,
		click_handler_3,
		click_handler_4
	];
}

class Badge extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$7, create_fragment$7, safe_not_equal, { variant: 0, closable: 1, large: 4 });
	}
}

/* src/Button.svelte generated by Svelte v3.48.0 */

function create_else_block$1(ctx) {
	let button;
	let button_class_value;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[9].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

	return {
		c() {
			button = element("button");
			if (default_slot) default_slot.c();
			button.disabled = /*disabled*/ ctx[1];
			attr(button, "style", /*style*/ ctx[0]);
			attr(button, "class", button_class_value = "primary flex gap-2 sbui-btn--" + (/*size*/ ctx[3] || 'tiny') + " text-sm text-white bg-brand-800 hover:bg-brand-600 rounded relative cursor-pointer inline-flex items-center space-x-2 text-center border border-solid border-transparent transition ease-out duration-200 outline-none focus:outline-none" + " svelte-40ekih");
		},
		m(target, anchor) {
			insert(target, button, anchor);

			if (default_slot) {
				default_slot.m(button, null);
			}

			current = true;

			if (!mounted) {
				dispose = [
					listen(button, "click", function () {
						if (is_function(/*onClick*/ ctx[4])) /*onClick*/ ctx[4].apply(this, arguments);
					}),
					listen(button, "focus", function () {
						if (is_function(/*onFocus*/ ctx[5])) /*onFocus*/ ctx[5].apply(this, arguments);
					}),
					listen(button, "blur", function () {
						if (is_function(/*onBlur*/ ctx[7])) /*onBlur*/ ctx[7].apply(this, arguments);
					}),
					listen(button, "dblclick", function () {
						if (is_function(/*onDblClick*/ ctx[6])) /*onDblClick*/ ctx[6].apply(this, arguments);
					})
				];

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[8],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[8])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[8], dirty, null),
						null
					);
				}
			}

			if (!current || dirty & /*disabled*/ 2) {
				button.disabled = /*disabled*/ ctx[1];
			}

			if (!current || dirty & /*style*/ 1) {
				attr(button, "style", /*style*/ ctx[0]);
			}

			if (!current || dirty & /*size*/ 8 && button_class_value !== (button_class_value = "primary flex gap-2 sbui-btn--" + (/*size*/ ctx[3] || 'tiny') + " text-sm text-white bg-brand-800 hover:bg-brand-600 rounded relative cursor-pointer inline-flex items-center space-x-2 text-center border border-solid border-transparent transition ease-out duration-200 outline-none focus:outline-none" + " svelte-40ekih")) {
				attr(button, "class", button_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(button);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (26:32) 
function create_if_block_1$2(ctx) {
	let button;
	let button_class_value;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[9].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

	return {
		c() {
			button = element("button");
			if (default_slot) default_slot.c();
			button.disabled = /*disabled*/ ctx[1];
			attr(button, "style", /*style*/ ctx[0]);
			attr(button, "class", button_class_value = "primary flex gap-2 sbui-btn--" + (/*size*/ ctx[3] || 'tiny') + " text-sm bg-red-900 hover:bg-red-800 hover:border-red-600 text-white border-red-500 text-red-500 rounded relative cursor-pointer inline-flex items-center space-x-2 text-center border border-solid transition ease-out duration-200 focus:outline-none" + " svelte-40ekih");
		},
		m(target, anchor) {
			insert(target, button, anchor);

			if (default_slot) {
				default_slot.m(button, null);
			}

			current = true;

			if (!mounted) {
				dispose = [
					listen(button, "click", function () {
						if (is_function(/*onClick*/ ctx[4])) /*onClick*/ ctx[4].apply(this, arguments);
					}),
					listen(button, "focus", function () {
						if (is_function(/*onFocus*/ ctx[5])) /*onFocus*/ ctx[5].apply(this, arguments);
					}),
					listen(button, "blur", function () {
						if (is_function(/*onBlur*/ ctx[7])) /*onBlur*/ ctx[7].apply(this, arguments);
					}),
					listen(button, "dblclick", function () {
						if (is_function(/*onDblClick*/ ctx[6])) /*onDblClick*/ ctx[6].apply(this, arguments);
					})
				];

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[8],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[8])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[8], dirty, null),
						null
					);
				}
			}

			if (!current || dirty & /*disabled*/ 2) {
				button.disabled = /*disabled*/ ctx[1];
			}

			if (!current || dirty & /*style*/ 1) {
				attr(button, "style", /*style*/ ctx[0]);
			}

			if (!current || dirty & /*size*/ 8 && button_class_value !== (button_class_value = "primary flex gap-2 sbui-btn--" + (/*size*/ ctx[3] || 'tiny') + " text-sm bg-red-900 hover:bg-red-800 hover:border-red-600 text-white border-red-500 text-red-500 rounded relative cursor-pointer inline-flex items-center space-x-2 text-center border border-solid transition ease-out duration-200 focus:outline-none" + " svelte-40ekih")) {
				attr(button, "class", button_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(button);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (13:2) {#if variant == "warning"}
function create_if_block$3(ctx) {
	let button;
	let button_class_value;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[9].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

	return {
		c() {
			button = element("button");
			if (default_slot) default_slot.c();
			button.disabled = /*disabled*/ ctx[1];
			attr(button, "style", /*style*/ ctx[0]);
			attr(button, "class", button_class_value = "primary flex gap-2 sbui-btn--" + (/*size*/ ctx[3] || 'tiny') + " text-sm text-white bg-orange-800 hover:bg-orange-600 rounded relative cursor-pointer inline-flex items-center space-x-2 text-center border border-solid border-transparent transition ease-out duration-200 outline-none focus:outline-none" + " svelte-40ekih");
		},
		m(target, anchor) {
			insert(target, button, anchor);

			if (default_slot) {
				default_slot.m(button, null);
			}

			current = true;

			if (!mounted) {
				dispose = [
					listen(button, "click", function () {
						if (is_function(/*onClick*/ ctx[4])) /*onClick*/ ctx[4].apply(this, arguments);
					}),
					listen(button, "focus", function () {
						if (is_function(/*onFocus*/ ctx[5])) /*onFocus*/ ctx[5].apply(this, arguments);
					}),
					listen(button, "blur", function () {
						if (is_function(/*onBlur*/ ctx[7])) /*onBlur*/ ctx[7].apply(this, arguments);
					}),
					listen(button, "dblclick", function () {
						if (is_function(/*onDblClick*/ ctx[6])) /*onDblClick*/ ctx[6].apply(this, arguments);
					})
				];

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[8],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[8])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[8], dirty, null),
						null
					);
				}
			}

			if (!current || dirty & /*disabled*/ 2) {
				button.disabled = /*disabled*/ ctx[1];
			}

			if (!current || dirty & /*style*/ 1) {
				attr(button, "style", /*style*/ ctx[0]);
			}

			if (!current || dirty & /*size*/ 8 && button_class_value !== (button_class_value = "primary flex gap-2 sbui-btn--" + (/*size*/ ctx[3] || 'tiny') + " text-sm text-white bg-orange-800 hover:bg-orange-600 rounded relative cursor-pointer inline-flex items-center space-x-2 text-center border border-solid border-transparent transition ease-out duration-200 outline-none focus:outline-none" + " svelte-40ekih")) {
				attr(button, "class", button_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(button);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

function create_fragment$6(ctx) {
	let span;
	let current_block_type_index;
	let if_block;
	let current;
	const if_block_creators = [create_if_block$3, create_if_block_1$2, create_else_block$1];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*variant*/ ctx[2] == "warning") return 0;
		if (/*variant*/ ctx[2] == "danger") return 1;
		return 2;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			span = element("span");
			if_block.c();
			attr(span, "class", "button-cont inline-flex font-medium");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			if_blocks[current_block_type_index].m(span, null);
			current = true;
		},
		p(ctx, [dirty]) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(span, null);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if_blocks[current_block_type_index].d();
		}
	};
}

function instance$6($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	let { style, disabled, variant, size, onClick, onFocus, onDblClick, onBlur } = $$props;

	$$self.$$set = $$props => {
		if ('style' in $$props) $$invalidate(0, style = $$props.style);
		if ('disabled' in $$props) $$invalidate(1, disabled = $$props.disabled);
		if ('variant' in $$props) $$invalidate(2, variant = $$props.variant);
		if ('size' in $$props) $$invalidate(3, size = $$props.size);
		if ('onClick' in $$props) $$invalidate(4, onClick = $$props.onClick);
		if ('onFocus' in $$props) $$invalidate(5, onFocus = $$props.onFocus);
		if ('onDblClick' in $$props) $$invalidate(6, onDblClick = $$props.onDblClick);
		if ('onBlur' in $$props) $$invalidate(7, onBlur = $$props.onBlur);
		if ('$$scope' in $$props) $$invalidate(8, $$scope = $$props.$$scope);
	};

	return [
		style,
		disabled,
		variant,
		size,
		onClick,
		onFocus,
		onDblClick,
		onBlur,
		$$scope,
		slots
	];
}

class Button extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
			style: 0,
			disabled: 1,
			variant: 2,
			size: 3,
			onClick: 4,
			onFocus: 5,
			onDblClick: 6,
			onBlur: 7
		});
	}
}

/* src/Checkbox.svelte generated by Svelte v3.48.0 */

const get_description_slot_changes$1 = dirty => ({});
const get_description_slot_context$1 = ctx => ({});
const get_label_slot_changes = dirty => ({});
const get_label_slot_context = ctx => ({});

function create_fragment$5(ctx) {
	let div3;
	let input;
	let t0;
	let div2;
	let label;
	let div0;
	let t1;
	let div1;
	let div3_class_value;
	let current;
	let mounted;
	let dispose;
	const label_slot_template = /*#slots*/ ctx[10].label;
	const label_slot = create_slot(label_slot_template, ctx, /*$$scope*/ ctx[9], get_label_slot_context);
	const description_slot_template = /*#slots*/ ctx[10].description;
	const description_slot = create_slot(description_slot_template, ctx, /*$$scope*/ ctx[9], get_description_slot_context$1);

	return {
		c() {
			div3 = element("div");
			input = element("input");
			t0 = space();
			div2 = element("div");
			label = element("label");
			div0 = element("div");
			if (label_slot) label_slot.c();
			t1 = space();
			div1 = element("div");
			if (description_slot) description_slot.c();
			input.disabled = /*disabled*/ ctx[8];
			input.value = /*value*/ ctx[3];
			attr(input, "name", /*name*/ ctx[1]);
			attr(input, "id", /*id*/ ctx[0]);
			input.checked = /*checked*/ ctx[2];
			attr(input, "type", "checkbox");
			attr(input, "class", "sbui-checkbox ml-auto mr-auto mt-1 border border-solid rounded text-brand-700 border-gray-300 transition-all hover:border-brand-500 focus:ring-brand-500 focus:outline-nonedark:bg-transparent dark:border-dark-400 dark:text-white dark:hover:border-brand-500 svelte-cxc85v");
			attr(div0, "class", "sbui-checkbox__label-container__label__div text-md text-black dark:text-white svelte-cxc85v");
			attr(div1, "class", "sbui-checkbox__label-container__label__p text-sm text-blackA-900 dark:text-whiteA-1000 svelte-cxc85v");
			attr(label, "for", /*id*/ ctx[0]);
			attr(label, "class", "sbui-checkbox__label-container__label label__cont flex flex-col gap1.5 ml-1 svelte-cxc85v");
			attr(div3, "class", div3_class_value = "sbui-checkbox-container--" + /*size*/ ctx[7] + " flex cursor-pointer" + " svelte-cxc85v");
		},
		m(target, anchor) {
			insert(target, div3, anchor);
			append(div3, input);
			append(div3, t0);
			append(div3, div2);
			append(div2, label);
			append(label, div0);

			if (label_slot) {
				label_slot.m(div0, null);
			}

			append(label, t1);
			append(label, div1);

			if (description_slot) {
				description_slot.m(div1, null);
			}

			current = true;

			if (!mounted) {
				dispose = [
					listen(input, "blur", function () {
						if (is_function(/*onBlur*/ ctx[6])) /*onBlur*/ ctx[6].apply(this, arguments);
					}),
					listen(input, "focus", function () {
						if (is_function(/*onFocus*/ ctx[5])) /*onFocus*/ ctx[5].apply(this, arguments);
					}),
					listen(input, "change", function () {
						if (is_function(/*onChange*/ ctx[4])) /*onChange*/ ctx[4].apply(this, arguments);
					})
				];

				mounted = true;
			}
		},
		p(new_ctx, [dirty]) {
			ctx = new_ctx;

			if (!current || dirty & /*disabled*/ 256) {
				input.disabled = /*disabled*/ ctx[8];
			}

			if (!current || dirty & /*value*/ 8) {
				input.value = /*value*/ ctx[3];
			}

			if (!current || dirty & /*name*/ 2) {
				attr(input, "name", /*name*/ ctx[1]);
			}

			if (!current || dirty & /*id*/ 1) {
				attr(input, "id", /*id*/ ctx[0]);
			}

			if (!current || dirty & /*checked*/ 4) {
				input.checked = /*checked*/ ctx[2];
			}

			if (label_slot) {
				if (label_slot.p && (!current || dirty & /*$$scope*/ 512)) {
					update_slot_base(
						label_slot,
						label_slot_template,
						ctx,
						/*$$scope*/ ctx[9],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[9])
						: get_slot_changes(label_slot_template, /*$$scope*/ ctx[9], dirty, get_label_slot_changes),
						get_label_slot_context
					);
				}
			}

			if (description_slot) {
				if (description_slot.p && (!current || dirty & /*$$scope*/ 512)) {
					update_slot_base(
						description_slot,
						description_slot_template,
						ctx,
						/*$$scope*/ ctx[9],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[9])
						: get_slot_changes(description_slot_template, /*$$scope*/ ctx[9], dirty, get_description_slot_changes$1),
						get_description_slot_context$1
					);
				}
			}

			if (!current || dirty & /*id*/ 1) {
				attr(label, "for", /*id*/ ctx[0]);
			}

			if (!current || dirty & /*size*/ 128 && div3_class_value !== (div3_class_value = "sbui-checkbox-container--" + /*size*/ ctx[7] + " flex cursor-pointer" + " svelte-cxc85v")) {
				attr(div3, "class", div3_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(label_slot, local);
			transition_in(description_slot, local);
			current = true;
		},
		o(local) {
			transition_out(label_slot, local);
			transition_out(description_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div3);
			if (label_slot) label_slot.d(detaching);
			if (description_slot) description_slot.d(detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$5($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	let { id = "default", name = "default", checked, value, onChange, onFocus, onBlur, size = "medium", disabled = false } = $$props;

	$$self.$$set = $$props => {
		if ('id' in $$props) $$invalidate(0, id = $$props.id);
		if ('name' in $$props) $$invalidate(1, name = $$props.name);
		if ('checked' in $$props) $$invalidate(2, checked = $$props.checked);
		if ('value' in $$props) $$invalidate(3, value = $$props.value);
		if ('onChange' in $$props) $$invalidate(4, onChange = $$props.onChange);
		if ('onFocus' in $$props) $$invalidate(5, onFocus = $$props.onFocus);
		if ('onBlur' in $$props) $$invalidate(6, onBlur = $$props.onBlur);
		if ('size' in $$props) $$invalidate(7, size = $$props.size);
		if ('disabled' in $$props) $$invalidate(8, disabled = $$props.disabled);
		if ('$$scope' in $$props) $$invalidate(9, $$scope = $$props.$$scope);
	};

	return [
		id,
		name,
		checked,
		value,
		onChange,
		onFocus,
		onBlur,
		size,
		disabled,
		$$scope,
		slots
	];
}

class Checkbox extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
			id: 0,
			name: 1,
			checked: 2,
			value: 3,
			onChange: 4,
			onFocus: 5,
			onBlur: 6,
			size: 7,
			disabled: 8
		});
	}
}

/* src/SupabaseUi.svelte generated by Svelte v3.48.0 */

function create_if_block$2(ctx) {
	let style;

	return {
		c() {
			style = element("style");
			style.textContent = "@import url(\"https://fonts.googleapis.com/css2?family=Montserrat:wght@400&display=swap\");\n    body,\n    html {\n      font-family: \"Montserrat\", sans-serif;\n      --tw-bg-opacity: 1;\n      background-color: rgb(31 31 31 / var(--tw-bg-opacity));\n      --tw-text-opacity: 1;\n      color: rgb(255 255 255 / var(--tw-text-opacity));\n    }";
			attr(style, "lang", "postcss");
		},
		m(target, anchor) {
			insert(target, style, anchor);
		},
		d(detaching) {
			if (detaching) detach(style);
		}
	};
}

function create_fragment$4(ctx) {
	let div;
	let t;
	let if_block_anchor;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);
	let if_block = /*theme*/ ctx[0] == "dark" && create_if_block$2();

	return {
		c() {
			div = element("div");
			if (default_slot) default_slot.c();
			t = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
			attr(div, "class", /*theme*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (default_slot) {
				default_slot.m(div, null);
			}

			insert(target, t, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}

			if (!current || dirty & /*theme*/ 1) {
				attr(div, "class", /*theme*/ ctx[0]);
			}

			if (/*theme*/ ctx[0] == "dark") {
				if (if_block) ; else {
					if_block = create_if_block$2();
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (default_slot) default_slot.d(detaching);
			if (detaching) detach(t);
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$4($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	let { theme } = $$props;

	$$self.$$set = $$props => {
		if ('theme' in $$props) $$invalidate(0, theme = $$props.theme);
		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
	};

	return [theme, $$scope, slots];
}

class SupabaseUi extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$4, create_fragment$4, safe_not_equal, { theme: 0 });
	}
}

/* src/Typography.svelte generated by Svelte v3.48.0 */

function create_if_block_4$1(ctx) {
	let h5;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			h5 = element("h5");
			if (default_slot) default_slot.c();
			attr(h5, "class", "sbui-typography-title svelte-dinqud");
		},
		m(target, anchor) {
			insert(target, h5, anchor);

			if (default_slot) {
				default_slot.m(h5, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h5);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (18:28) 
function create_if_block_3$1(ctx) {
	let h4;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			h4 = element("h4");
			if (default_slot) default_slot.c();
			attr(h4, "class", "sbui-typography-title svelte-dinqud");
		},
		m(target, anchor) {
			insert(target, h4, anchor);

			if (default_slot) {
				default_slot.m(h4, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h4);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (14:28) 
function create_if_block_2$1(ctx) {
	let h3;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			h3 = element("h3");
			if (default_slot) default_slot.c();
			attr(h3, "class", "sbui-typography-title svelte-dinqud");
		},
		m(target, anchor) {
			insert(target, h3, anchor);

			if (default_slot) {
				default_slot.m(h3, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h3);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (10:28) 
function create_if_block_1$1(ctx) {
	let h2;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			h2 = element("h2");
			if (default_slot) default_slot.c();
			attr(h2, "class", "sbui-typography-title svelte-dinqud");
		},
		m(target, anchor) {
			insert(target, h2, anchor);

			if (default_slot) {
				default_slot.m(h2, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h2);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (6:2) {#if variant == "h1"}
function create_if_block$1(ctx) {
	let h1;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			h1 = element("h1");
			if (default_slot) default_slot.c();
			attr(h1, "class", "sbui-typography-title svelte-dinqud");
		},
		m(target, anchor) {
			insert(target, h1, anchor);

			if (default_slot) {
				default_slot.m(h1, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h1);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function create_fragment$3(ctx) {
	let span;
	let current_block_type_index;
	let if_block;
	let current;

	const if_block_creators = [
		create_if_block$1,
		create_if_block_1$1,
		create_if_block_2$1,
		create_if_block_3$1,
		create_if_block_4$1
	];

	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*variant*/ ctx[0] == "h1") return 0;
		if (/*variant*/ ctx[0] == "h2") return 1;
		if (/*variant*/ ctx[0] == "h3") return 2;
		if (/*variant*/ ctx[0] == "h4") return 3;
		if (/*variant*/ ctx[0] == "h5") return 4;
		return -1;
	}

	if (~(current_block_type_index = select_block_type(ctx))) {
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	}

	return {
		c() {
			span = element("span");
			if (if_block) if_block.c();
			attr(span, "class", "text-gray-900");
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (~current_block_type_index) {
				if_blocks[current_block_type_index].m(span, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if (~current_block_type_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				}
			} else {
				if (if_block) {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
				}

				if (~current_block_type_index) {
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(span, null);
				} else {
					if_block = null;
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);

			if (~current_block_type_index) {
				if_blocks[current_block_type_index].d();
			}
		}
	};
}

function instance$3($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	let { variant } = $$props;

	$$self.$$set = $$props => {
		if ('variant' in $$props) $$invalidate(0, variant = $$props.variant);
		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
	};

	return [variant, $$scope, slots];
}

class Typography extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$3, create_fragment$3, safe_not_equal, { variant: 0 });
	}
}

/* src/Card.svelte generated by Svelte v3.48.0 */

const get_actions_slot_changes = dirty => ({});
const get_actions_slot_context = ctx => ({});
const get_description_slot_changes = dirty => ({});
const get_description_slot_context = ctx => ({});
const get_image_slot_changes = dirty => ({});
const get_image_slot_context = ctx => ({});
const get_more_title_slot_changes = dirty => ({});
const get_more_title_slot_context = ctx => ({});
const get_title_slot_changes = dirty => ({});
const get_title_slot_context = ctx => ({});

function create_fragment$2(ctx) {
	let div4;
	let div0;
	let t0;
	let span;
	let t1;
	let div2;
	let div1;
	let t2;
	let t3;
	let div3;
	let div4_class_value;
	let current;
	const title_slot_template = /*#slots*/ ctx[3].title;
	const title_slot = create_slot(title_slot_template, ctx, /*$$scope*/ ctx[2], get_title_slot_context);
	const more_title_slot_template = /*#slots*/ ctx[3]["more-title"];
	const more_title_slot = create_slot(more_title_slot_template, ctx, /*$$scope*/ ctx[2], get_more_title_slot_context);
	const image_slot_template = /*#slots*/ ctx[3].image;
	const image_slot = create_slot(image_slot_template, ctx, /*$$scope*/ ctx[2], get_image_slot_context);
	const description_slot_template = /*#slots*/ ctx[3].description;
	const description_slot = create_slot(description_slot_template, ctx, /*$$scope*/ ctx[2], get_description_slot_context);
	const actions_slot_template = /*#slots*/ ctx[3].actions;
	const actions_slot = create_slot(actions_slot_template, ctx, /*$$scope*/ ctx[2], get_actions_slot_context);

	return {
		c() {
			div4 = element("div");
			div0 = element("div");
			if (title_slot) title_slot.c();
			t0 = space();
			span = element("span");
			if (more_title_slot) more_title_slot.c();
			t1 = space();
			div2 = element("div");
			div1 = element("div");
			if (image_slot) image_slot.c();
			t2 = space();
			if (description_slot) description_slot.c();
			t3 = space();
			div3 = element("div");
			if (actions_slot) actions_slot.c();
			attr(span, "class", "ml-auto mr-2 text-green-900");
			attr(div0, "class", "sbui-card-head flex svelte-j268d0");
			attr(div1, "class", "flex items-center mb-3 justify-center");
			attr(div2, "class", "sbui-card-content svelte-j268d0");
			attr(div3, "class", "sbui-card-actions p-8 pt-0");
			attr(div4, "class", div4_class_value = "sbui-card " + /*hoverClass*/ ctx[0] + " flex flex-col bg-white dark:bg-dark-700 rounded-md shadow-lg overflow-hidden relative" + " svelte-j268d0");
		},
		m(target, anchor) {
			insert(target, div4, anchor);
			append(div4, div0);

			if (title_slot) {
				title_slot.m(div0, null);
			}

			append(div0, t0);
			append(div0, span);

			if (more_title_slot) {
				more_title_slot.m(span, null);
			}

			append(div4, t1);
			append(div4, div2);
			append(div2, div1);

			if (image_slot) {
				image_slot.m(div1, null);
			}

			append(div2, t2);

			if (description_slot) {
				description_slot.m(div2, null);
			}

			append(div4, t3);
			append(div4, div3);

			if (actions_slot) {
				actions_slot.m(div3, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (title_slot) {
				if (title_slot.p && (!current || dirty & /*$$scope*/ 4)) {
					update_slot_base(
						title_slot,
						title_slot_template,
						ctx,
						/*$$scope*/ ctx[2],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
						: get_slot_changes(title_slot_template, /*$$scope*/ ctx[2], dirty, get_title_slot_changes),
						get_title_slot_context
					);
				}
			}

			if (more_title_slot) {
				if (more_title_slot.p && (!current || dirty & /*$$scope*/ 4)) {
					update_slot_base(
						more_title_slot,
						more_title_slot_template,
						ctx,
						/*$$scope*/ ctx[2],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
						: get_slot_changes(more_title_slot_template, /*$$scope*/ ctx[2], dirty, get_more_title_slot_changes),
						get_more_title_slot_context
					);
				}
			}

			if (image_slot) {
				if (image_slot.p && (!current || dirty & /*$$scope*/ 4)) {
					update_slot_base(
						image_slot,
						image_slot_template,
						ctx,
						/*$$scope*/ ctx[2],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
						: get_slot_changes(image_slot_template, /*$$scope*/ ctx[2], dirty, get_image_slot_changes),
						get_image_slot_context
					);
				}
			}

			if (description_slot) {
				if (description_slot.p && (!current || dirty & /*$$scope*/ 4)) {
					update_slot_base(
						description_slot,
						description_slot_template,
						ctx,
						/*$$scope*/ ctx[2],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
						: get_slot_changes(description_slot_template, /*$$scope*/ ctx[2], dirty, get_description_slot_changes),
						get_description_slot_context
					);
				}
			}

			if (actions_slot) {
				if (actions_slot.p && (!current || dirty & /*$$scope*/ 4)) {
					update_slot_base(
						actions_slot,
						actions_slot_template,
						ctx,
						/*$$scope*/ ctx[2],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
						: get_slot_changes(actions_slot_template, /*$$scope*/ ctx[2], dirty, get_actions_slot_changes),
						get_actions_slot_context
					);
				}
			}

			if (!current || dirty & /*hoverClass*/ 1 && div4_class_value !== (div4_class_value = "sbui-card " + /*hoverClass*/ ctx[0] + " flex flex-col bg-white dark:bg-dark-700 rounded-md shadow-lg overflow-hidden relative" + " svelte-j268d0")) {
				attr(div4, "class", div4_class_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(title_slot, local);
			transition_in(more_title_slot, local);
			transition_in(image_slot, local);
			transition_in(description_slot, local);
			transition_in(actions_slot, local);
			current = true;
		},
		o(local) {
			transition_out(title_slot, local);
			transition_out(more_title_slot, local);
			transition_out(image_slot, local);
			transition_out(description_slot, local);
			transition_out(actions_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div4);
			if (title_slot) title_slot.d(detaching);
			if (more_title_slot) more_title_slot.d(detaching);
			if (image_slot) image_slot.d(detaching);
			if (description_slot) description_slot.d(detaching);
			if (actions_slot) actions_slot.d(detaching);
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	let { hoverable } = $$props;
	let hoverClass;

	if (hoverable == true) {
		hoverClass = "transition transform hover:-translate-y-1 hover:shadow-2xl";
	}

	$$self.$$set = $$props => {
		if ('hoverable' in $$props) $$invalidate(1, hoverable = $$props.hoverable);
		if ('$$scope' in $$props) $$invalidate(2, $$scope = $$props.$$scope);
	};

	return [hoverClass, hoverable, $$scope, slots];
}

class Card extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { hoverable: 1 });
	}
}

/* src/Text.svelte generated by Svelte v3.48.0 */

function create_else_block(ctx) {
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			if (default_slot) default_slot.c();
		},
		m(target, anchor) {
			if (default_slot) {
				default_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (53:31) 
function create_if_block_11(ctx) {
	let span;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			span = element("span");
			if (default_slot) default_slot.c();
			attr(span, "class", "sbui-typography-text-small svelte-ssulxi");
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (default_slot) {
				default_slot.m(span, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (49:39) 
function create_if_block_10(ctx) {
	let span;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			span = element("span");
			if (default_slot) default_slot.c();
			attr(span, "class", "sbui-typography-text-strikethrough svelte-ssulxi");
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (default_slot) {
				default_slot.m(span, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (45:32) 
function create_if_block_9(ctx) {
	let strong;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			strong = element("strong");
			if (default_slot) default_slot.c();
			attr(strong, "class", "sbui-typography-text svelte-ssulxi");
		},
		m(target, anchor) {
			insert(target, strong, anchor);

			if (default_slot) {
				default_slot.m(strong, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(strong);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (41:29) 
function create_if_block_8(ctx) {
	let kbd;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			kbd = element("kbd");
			if (default_slot) default_slot.c();
			attr(kbd, "class", "sbui-typography-text svelte-ssulxi");
		},
		m(target, anchor) {
			insert(target, kbd, anchor);

			if (default_slot) {
				default_slot.m(kbd, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(kbd);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (37:30) 
function create_if_block_7(ctx) {
	let code;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			code = element("code");
			if (default_slot) default_slot.c();
			attr(code, "class", "sbui-typography-text svelte-ssulxi");
		},
		m(target, anchor) {
			insert(target, code, anchor);

			if (default_slot) {
				default_slot.m(code, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(code);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (33:30) 
function create_if_block_6(ctx) {
	let mark;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			mark = element("mark");
			if (default_slot) default_slot.c();
			attr(mark, "class", "sbui-typography-text svelte-ssulxi");
		},
		m(target, anchor) {
			insert(target, mark, anchor);

			if (default_slot) {
				default_slot.m(mark, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(mark);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (29:35) 
function create_if_block_5(ctx) {
	let span;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			span = element("span");
			if (default_slot) default_slot.c();
			attr(span, "class", "sbui-typography-text-underline svelte-ssulxi");
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (default_slot) {
				default_slot.m(span, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (22:35) 
function create_if_block_4(ctx) {
	let span;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			span = element("span");
			if (default_slot) default_slot.c();
			attr(span, "class", "sbui-typography-text-secondary dark:text-typography-body-secondary-dark;  svelte-ssulxi");
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (default_slot) {
				default_slot.m(span, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (18:34) 
function create_if_block_3(ctx) {
	let span;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			span = element("span");
			if (default_slot) default_slot.c();
			attr(span, "class", "sbui-typography-text-disabled dark:text-gray-900 svelte-ssulxi");
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (default_slot) {
				default_slot.m(span, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (14:32) 
function create_if_block_2(ctx) {
	let span;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			span = element("span");
			if (default_slot) default_slot.c();
			attr(span, "class", "sbui-typography-text-danger dark:text-red-900 svelte-ssulxi");
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (default_slot) {
				default_slot.m(span, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (10:33) 
function create_if_block_1(ctx) {
	let span;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			span = element("span");
			if (default_slot) default_slot.c();
			attr(span, "class", "sbui-typography-text-warning dark:text-yellow-900 svelte-ssulxi");
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (default_slot) {
				default_slot.m(span, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (6:2) {#if variant == "success"}
function create_if_block(ctx) {
	let span;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	return {
		c() {
			span = element("span");
			if (default_slot) default_slot.c();
			attr(span, "class", "sbui-typography-text-success dark:text-green-900 svelte-ssulxi");
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (default_slot) {
				default_slot.m(span, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function create_fragment$1(ctx) {
	let span;
	let current_block_type_index;
	let if_block;
	let current;

	const if_block_creators = [
		create_if_block,
		create_if_block_1,
		create_if_block_2,
		create_if_block_3,
		create_if_block_4,
		create_if_block_5,
		create_if_block_6,
		create_if_block_7,
		create_if_block_8,
		create_if_block_9,
		create_if_block_10,
		create_if_block_11,
		create_else_block
	];

	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*variant*/ ctx[0] == "success") return 0;
		if (/*variant*/ ctx[0] == "warning") return 1;
		if (/*variant*/ ctx[0] == "danger") return 2;
		if (/*variant*/ ctx[0] == "disabled") return 3;
		if (/*variant*/ ctx[0] == "secondary") return 4;
		if (/*variant*/ ctx[0] == "underline") return 5;
		if (/*variant*/ ctx[0] == "mark") return 6;
		if (/*variant*/ ctx[0] == "code") return 7;
		if (/*variant*/ ctx[0] == "kbd") return 8;
		if (/*variant*/ ctx[0] == "strong") return 9;
		if (/*variant*/ ctx[0] == "strikethrough") return 10;
		if (/*variant*/ ctx[0] == "small") return 11;
		return 12;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			span = element("span");
			if_block.c();
			attr(span, "class", "sbui-typography-text dark:text-typography-body-dark svelte-ssulxi");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			if_blocks[current_block_type_index].m(span, null);
			current = true;
		},
		p(ctx, [dirty]) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(span, null);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if_blocks[current_block_type_index].d();
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	let { variant } = $$props;

	$$self.$$set = $$props => {
		if ('variant' in $$props) $$invalidate(0, variant = $$props.variant);
		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
	};

	return [variant, $$scope, slots];
}

class Text extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { variant: 0 });
	}
}

/* src/App.svelte generated by Svelte v3.48.0 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[2] = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[5] = list[i];
	return child_ctx;
}

function get_each_context_2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[2] = list[i];
	return child_ctx;
}

function get_each_context_3(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[2] = list[i];
	return child_ctx;
}

function get_each_context_4(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[2] = list[i];
	return child_ctx;
}

function get_each_context_5(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[2] = list[i];
	return child_ctx;
}

// (29:4) <Typography variant="h1">
function create_default_slot_14(ctx) {
	let t;

	return {
		c() {
			t = text("svelte supabase ui");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (32:4) <Typography variant="h2">
function create_default_slot_13(ctx) {
	let t;

	return {
		c() {
			t = text("Badge");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (37:6) <Badge large={true} closable={true} variant={color}>
function create_default_slot_12(ctx) {
	let t0;
	let t1;

	return {
		c() {
			t0 = text(/*color*/ ctx[2]);
			t1 = space();
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(t0);
			if (detaching) detach(t1);
		}
	};
}

// (36:4) {#each ["success", "no variant", "warning", "danger", "info"] as color}
function create_each_block_5(ctx) {
	let badge;
	let current;

	badge = new Badge({
			props: {
				large: true,
				closable: true,
				variant: /*color*/ ctx[2],
				$$slots: { default: [create_default_slot_12] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(badge.$$.fragment);
		},
		m(target, anchor) {
			mount_component(badge, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const badge_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				badge_changes.$$scope = { dirty, ctx };
			}

			badge.$set(badge_changes);
		},
		i(local) {
			if (current) return;
			transition_in(badge.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(badge.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(badge, detaching);
		}
	};
}

// (44:4) <Typography variant="h2">
function create_default_slot_11(ctx) {
	let t;

	return {
		c() {
			t = text("Alert");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (50:10) 
function create_title_slot_1(ctx) {
	let div;
	let t0;
	let t1;

	return {
		c() {
			div = element("div");
			t0 = text(/*color*/ ctx[2]);
			t1 = text(" class");
			attr(div, "slot", "title");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t0);
			append(div, t1);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (51:10) 
function create_description_slot_2(ctx) {
	let div;
	let t0;
	let t1;
	let t2;

	return {
		c() {
			div = element("div");
			t0 = text("this was formed with the ");
			t1 = text(/*color*/ ctx[2]);
			t2 = text(" class in the alert component in varient\n            prop.");
			attr(div, "slot", "description");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t0);
			append(div, t1);
			append(div, t2);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (47:4) {#each ["success", "warning", "danger", "info"] as color}
function create_each_block_4(ctx) {
	let div;
	let alert;
	let t;
	let br;
	let current;

	alert = new Alert({
			props: {
				variant: /*color*/ ctx[2],
				withIcon: true,
				closable: true,
				$$slots: {
					description: [create_description_slot_2],
					title: [create_title_slot_1]
				},
				$$scope: { ctx }
			}
		});

	return {
		c() {
			div = element("div");
			create_component(alert.$$.fragment);
			t = space();
			br = element("br");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(alert, div, null);
			insert(target, t, anchor);
			insert(target, br, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const alert_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				alert_changes.$$scope = { dirty, ctx };
			}

			alert.$set(alert_changes);
		},
		i(local) {
			if (current) return;
			transition_in(alert.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(alert.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(alert);
			if (detaching) detach(t);
			if (detaching) detach(br);
		}
	};
}

// (61:4) <Typography variant="h2">
function create_default_slot_10(ctx) {
	let t;

	return {
		c() {
			t = text("Inputs");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (64:4) {#each ["success", "warning", "danger", "info"] as color}
function create_each_block_3(ctx) {
	let input;
	let current;

	input = new Input({
			props: {
				style: "margin:10px;",
				variant: /*color*/ ctx[2],
				value: "" + (/*color*/ ctx[2] + " input"),
				placeholder: "placeholder",
				type: "text"
			}
		});

	return {
		c() {
			create_component(input.$$.fragment);
		},
		m(target, anchor) {
			mount_component(input, target, anchor);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(input.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(input.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(input, detaching);
		}
	};
}

// (85:4) <Typography variant="h2">
function create_default_slot_9(ctx) {
	let t;

	return {
		c() {
			t = text("Buttons");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (89:6) <Button style="margin: 10px;" variant={color}>
function create_default_slot_8(ctx) {
	let t0;
	let t1;

	return {
		c() {
			t0 = text(/*color*/ ctx[2]);
			t1 = text(" variant");
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(t0);
			if (detaching) detach(t1);
		}
	};
}

// (88:4) {#each ["success", "warning", "danger"] as color}
function create_each_block_2(ctx) {
	let button;
	let t;
	let br;
	let current;

	button = new Button({
			props: {
				style: "margin: 10px;",
				variant: /*color*/ ctx[2],
				$$slots: { default: [create_default_slot_8] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(button.$$.fragment);
			t = space();
			br = element("br");
		},
		m(target, anchor) {
			mount_component(button, target, anchor);
			insert(target, t, anchor);
			insert(target, br, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const button_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				button_changes.$$scope = { dirty, ctx };
			}

			button.$set(button_changes);
		},
		i(local) {
			if (current) return;
			transition_in(button.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(button.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(button, detaching);
			if (detaching) detach(t);
			if (detaching) detach(br);
		}
	};
}

// (97:4) <Typography variant="h2">
function create_default_slot_7(ctx) {
	let t;

	return {
		c() {
			t = text("Checkbox");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (101:6) 
function create_label_slot(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.textContent = "label";
			attr(div, "slot", "label");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (102:6) 
function create_description_slot_1(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.textContent = "Lorem ipsum dolor sit amet consectetur adipisicing elit. Ducimus,\n        temporibus. Illo vitae sint iste sit esse pariatur, qui deserunt, autem\n        maxime odio at voluptas incidunt odit ullam? Commodi, vitae voluptates!";
			attr(div, "slot", "description");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (111:4) <Typography variant="h2">
function create_default_slot_6(ctx) {
	let t;

	return {
		c() {
			t = text("Typography");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (116:8) <Typography variant={variants}>
function create_default_slot_5(ctx) {
	let t0;
	let t1;

	return {
		c() {
			t0 = text("Heading ");
			t1 = text(/*variants*/ ctx[5]);
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(t0);
			if (detaching) detach(t1);
		}
	};
}

// (114:4) {#each ["h1", "h2", "h3", "h4", "h5", "h6"] as variants}
function create_each_block_1(ctx) {
	let span;
	let typography;
	let t;
	let current;

	typography = new Typography({
			props: {
				variant: /*variants*/ ctx[5],
				$$slots: { default: [create_default_slot_5] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			span = element("span");
			create_component(typography.$$.fragment);
			t = space();
			attr(span, "class", "m-1");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			mount_component(typography, span, null);
			append(span, t);
			current = true;
		},
		p(ctx, dirty) {
			const typography_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				typography_changes.$$scope = { dirty, ctx };
			}

			typography.$set(typography_changes);
		},
		i(local) {
			if (current) return;
			transition_in(typography.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(typography.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			destroy_component(typography);
		}
	};
}

// (122:4) <Typography variant="h2">
function create_default_slot_4(ctx) {
	let t;

	return {
		c() {
			t = text("Card");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (126:6) 
function create_more_title_slot(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "learn more";
			attr(span, "slot", "more-title");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (127:6) 
function create_title_slot(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "title";
			attr(span, "slot", "title");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (128:6) 
function create_image_slot(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.innerHTML = `<img src="https://images.unsplash.com/photo-1503424886307-b090341d25d1?ixlib=rb-1.2.1&amp;ixid=MnwxMjA3fDB8MHxleHBsb3JlLWZlZWR8Mnx8fGVufDB8fHx8&amp;auto=format&amp;fit=crop&amp;w=800&amp;q=60" class="rounded m-2" alt=""/>`;
			attr(span, "slot", "image");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (135:6) 
function create_description_slot(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Aperiam\n        praesentium ex cumque minus ab sed expedita corporis! Earum illo cum\n        expedita, eum quam cupiditate, ratione odio, illum officiis laudantium\n        sequi! Corporis nihil tempore neque, mollitia ut cumque corrupti\n        provident non incidunt autem accusamus rem eius? Voluptatibus, voluptate\n        excepturi. Explicabo sit corrupti ipsam tenetur consequuntur. Ullam\n        pariatur temporibus optio exercitationem magni!";
			attr(span, "slot", "description");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (145:8) <Button size="large" variant="success">
function create_default_slot_3(ctx) {
	let t;

	return {
		c() {
			t = text("Go to site");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (144:6) 
function create_actions_slot(ctx) {
	let div;
	let button;
	let current;

	button = new Button({
			props: {
				size: "large",
				variant: "success",
				$$slots: { default: [create_default_slot_3] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			div = element("div");
			create_component(button.$$.fragment);
			attr(div, "slot", "actions");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(button, div, null);
			current = true;
		},
		p(ctx, dirty) {
			const button_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				button_changes.$$scope = { dirty, ctx };
			}

			button.$set(button_changes);
		},
		i(local) {
			if (current) return;
			transition_in(button.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(button.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(button);
		}
	};
}

// (151:4) <Typography variant="h2">
function create_default_slot_2(ctx) {
	let t;

	return {
		c() {
			t = text("Text");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (155:6) <Text style="margin: 10px;" variant={color}>
function create_default_slot_1(ctx) {
	let t0;
	let t1;

	return {
		c() {
			t0 = text(/*color*/ ctx[2]);
			t1 = text(" variant");
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(t0);
			if (detaching) detach(t1);
		}
	};
}

// (154:4) {#each ["success", "warning", "danger", "disabled", "secondary", "mark", "kbd", "strikethrough", "underline", "code", "small", "strong"] as color}
function create_each_block(ctx) {
	let text_1;
	let t;
	let br;
	let current;

	text_1 = new Text({
			props: {
				style: "margin: 10px;",
				variant: /*color*/ ctx[2],
				$$slots: { default: [create_default_slot_1] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(text_1.$$.fragment);
			t = space();
			br = element("br");
		},
		m(target, anchor) {
			mount_component(text_1, target, anchor);
			insert(target, t, anchor);
			insert(target, br, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const text_1_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				text_1_changes.$$scope = { dirty, ctx };
			}

			text_1.$set(text_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(text_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(text_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(text_1, detaching);
			if (detaching) detach(t);
			if (detaching) detach(br);
		}
	};
}

// (16:0) <SupabaseUi {theme}>
function create_default_slot(ctx) {
	let div0;
	let typography0;
	let t0;
	let span0;
	let typography1;
	let t1;
	let br;
	let t2;
	let div1;
	let t3;
	let span1;
	let typography2;
	let t4;
	let div2;
	let t5;
	let span2;
	let typography3;
	let t6;
	let div3;
	let t7;
	let input;
	let t8;
	let span3;
	let typography4;
	let t9;
	let div4;
	let t10;
	let span4;
	let typography5;
	let t11;
	let div5;
	let checkbox;
	let t12;
	let span5;
	let typography6;
	let t13;
	let div6;
	let t14;
	let span6;
	let typography7;
	let t15;
	let div7;
	let card;
	let t16;
	let span7;
	let typography8;
	let t17;
	let div8;
	let current;
	let mounted;
	let dispose;

	typography0 = new Typography({
			props: {
				variant: "h1",
				$$slots: { default: [create_default_slot_14] },
				$$scope: { ctx }
			}
		});

	typography1 = new Typography({
			props: {
				variant: "h2",
				$$slots: { default: [create_default_slot_13] },
				$$scope: { ctx }
			}
		});

	let each_value_5 = ["success", "no variant", "warning", "danger", "info"];
	let each_blocks_5 = [];

	for (let i = 0; i < 5; i += 1) {
		each_blocks_5[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
	}

	typography2 = new Typography({
			props: {
				variant: "h2",
				$$slots: { default: [create_default_slot_11] },
				$$scope: { ctx }
			}
		});

	let each_value_4 = ["success", "warning", "danger", "info"];
	let each_blocks_4 = [];

	for (let i = 0; i < 4; i += 1) {
		each_blocks_4[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
	}

	typography3 = new Typography({
			props: {
				variant: "h2",
				$$slots: { default: [create_default_slot_10] },
				$$scope: { ctx }
			}
		});

	let each_value_3 = ["success", "warning", "danger", "info"];
	let each_blocks_3 = [];

	for (let i = 0; i < 4; i += 1) {
		each_blocks_3[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
	}

	input = new Input({
			props: {
				size: "xlarge",
				icon: UserIcon,
				style: "margin:10px;",
				variant: "success",
				value: "with icon",
				placeholder: "placeholder",
				type: "text"
			}
		});

	typography4 = new Typography({
			props: {
				variant: "h2",
				$$slots: { default: [create_default_slot_9] },
				$$scope: { ctx }
			}
		});

	let each_value_2 = ["success", "warning", "danger"];
	let each_blocks_2 = [];

	for (let i = 0; i < 3; i += 1) {
		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
	}

	typography5 = new Typography({
			props: {
				variant: "h2",
				$$slots: { default: [create_default_slot_7] },
				$$scope: { ctx }
			}
		});

	checkbox = new Checkbox({
			props: {
				$$slots: {
					description: [create_description_slot_1],
					label: [create_label_slot]
				},
				$$scope: { ctx }
			}
		});

	typography6 = new Typography({
			props: {
				variant: "h2",
				$$slots: { default: [create_default_slot_6] },
				$$scope: { ctx }
			}
		});

	let each_value_1 = ["h1", "h2", "h3", "h4", "h5", "h6"];
	let each_blocks_1 = [];

	for (let i = 0; i < 6; i += 1) {
		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	typography7 = new Typography({
			props: {
				variant: "h2",
				$$slots: { default: [create_default_slot_4] },
				$$scope: { ctx }
			}
		});

	card = new Card({
			props: {
				hoverable: true,
				$$slots: {
					actions: [create_actions_slot],
					description: [create_description_slot],
					image: [create_image_slot],
					title: [create_title_slot],
					"more-title": [create_more_title_slot]
				},
				$$scope: { ctx }
			}
		});

	typography8 = new Typography({
			props: {
				variant: "h2",
				$$slots: { default: [create_default_slot_2] },
				$$scope: { ctx }
			}
		});

	let each_value = [
		"success",
		"warning",
		"danger",
		"disabled",
		"secondary",
		"mark",
		"kbd",
		"strikethrough",
		"underline",
		"code",
		"small",
		"strong"
	];

	let each_blocks = [];

	for (let i = 0; i < 12; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c() {
			div0 = element("div");
			create_component(typography0.$$.fragment);
			t0 = space();
			span0 = element("span");
			create_component(typography1.$$.fragment);
			t1 = space();
			br = element("br");
			t2 = space();
			div1 = element("div");

			for (let i = 0; i < 5; i += 1) {
				each_blocks_5[i].c();
			}

			t3 = space();
			span1 = element("span");
			create_component(typography2.$$.fragment);
			t4 = space();
			div2 = element("div");

			for (let i = 0; i < 4; i += 1) {
				each_blocks_4[i].c();
			}

			t5 = space();
			span2 = element("span");
			create_component(typography3.$$.fragment);
			t6 = space();
			div3 = element("div");

			for (let i = 0; i < 4; i += 1) {
				each_blocks_3[i].c();
			}

			t7 = space();
			create_component(input.$$.fragment);
			t8 = space();
			span3 = element("span");
			create_component(typography4.$$.fragment);
			t9 = space();
			div4 = element("div");

			for (let i = 0; i < 3; i += 1) {
				each_blocks_2[i].c();
			}

			t10 = space();
			span4 = element("span");
			create_component(typography5.$$.fragment);
			t11 = space();
			div5 = element("div");
			create_component(checkbox.$$.fragment);
			t12 = space();
			span5 = element("span");
			create_component(typography6.$$.fragment);
			t13 = space();
			div6 = element("div");

			for (let i = 0; i < 6; i += 1) {
				each_blocks_1[i].c();
			}

			t14 = space();
			span6 = element("span");
			create_component(typography7.$$.fragment);
			t15 = space();
			div7 = element("div");
			create_component(card.$$.fragment);
			t16 = space();
			span7 = element("span");
			create_component(typography8.$$.fragment);
			t17 = space();
			div8 = element("div");

			for (let i = 0; i < 12; i += 1) {
				each_blocks[i].c();
			}

			attr(div0, "class", "m-4 text-center");
			attr(span0, "class", "m-2");
			attr(div1, "class", "m-4");
			attr(span1, "class", "m-2");
			attr(div2, "class", "m-4");
			attr(span2, "class", "m-2");
			attr(div3, "class", "m-4");
			attr(span3, "class", "m-2");
			attr(div4, "class", "m-4");
			attr(span4, "class", "m-2");
			attr(div5, "class", "m-4");
			attr(span5, "class", "m-2");
			attr(div6, "class", "m-4 shadow-md rounded");
			attr(span6, "class", "m-2");
			attr(div7, "class", "m-4 shadow-md rounded");
			attr(span7, "class", "m-2");
			attr(div8, "class", "m-4");
		},
		m(target, anchor) {
			insert(target, div0, anchor);
			mount_component(typography0, div0, null);
			insert(target, t0, anchor);
			insert(target, span0, anchor);
			mount_component(typography1, span0, null);
			insert(target, t1, anchor);
			insert(target, br, anchor);
			insert(target, t2, anchor);
			insert(target, div1, anchor);

			for (let i = 0; i < 5; i += 1) {
				each_blocks_5[i].m(div1, null);
			}

			insert(target, t3, anchor);
			insert(target, span1, anchor);
			mount_component(typography2, span1, null);
			insert(target, t4, anchor);
			insert(target, div2, anchor);

			for (let i = 0; i < 4; i += 1) {
				each_blocks_4[i].m(div2, null);
			}

			insert(target, t5, anchor);
			insert(target, span2, anchor);
			mount_component(typography3, span2, null);
			insert(target, t6, anchor);
			insert(target, div3, anchor);

			for (let i = 0; i < 4; i += 1) {
				each_blocks_3[i].m(div3, null);
			}

			append(div3, t7);
			mount_component(input, div3, null);
			insert(target, t8, anchor);
			insert(target, span3, anchor);
			mount_component(typography4, span3, null);
			insert(target, t9, anchor);
			insert(target, div4, anchor);

			for (let i = 0; i < 3; i += 1) {
				each_blocks_2[i].m(div4, null);
			}

			insert(target, t10, anchor);
			insert(target, span4, anchor);
			mount_component(typography5, span4, null);
			insert(target, t11, anchor);
			insert(target, div5, anchor);
			mount_component(checkbox, div5, null);
			insert(target, t12, anchor);
			insert(target, span5, anchor);
			mount_component(typography6, span5, null);
			insert(target, t13, anchor);
			insert(target, div6, anchor);

			for (let i = 0; i < 6; i += 1) {
				each_blocks_1[i].m(div6, null);
			}

			insert(target, t14, anchor);
			insert(target, span6, anchor);
			mount_component(typography7, span6, null);
			insert(target, t15, anchor);
			insert(target, div7, anchor);
			mount_component(card, div7, null);
			insert(target, t16, anchor);
			insert(target, span7, anchor);
			mount_component(typography8, span7, null);
			insert(target, t17, anchor);
			insert(target, div8, anchor);

			for (let i = 0; i < 12; i += 1) {
				each_blocks[i].m(div8, null);
			}

			current = true;

			if (!mounted) {
				dispose = listen(div0, "click", /*click_handler*/ ctx[1]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			const typography0_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				typography0_changes.$$scope = { dirty, ctx };
			}

			typography0.$set(typography0_changes);
			const typography1_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				typography1_changes.$$scope = { dirty, ctx };
			}

			typography1.$set(typography1_changes);
			const typography2_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				typography2_changes.$$scope = { dirty, ctx };
			}

			typography2.$set(typography2_changes);
			const typography3_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				typography3_changes.$$scope = { dirty, ctx };
			}

			typography3.$set(typography3_changes);
			const typography4_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				typography4_changes.$$scope = { dirty, ctx };
			}

			typography4.$set(typography4_changes);
			const typography5_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				typography5_changes.$$scope = { dirty, ctx };
			}

			typography5.$set(typography5_changes);
			const checkbox_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				checkbox_changes.$$scope = { dirty, ctx };
			}

			checkbox.$set(checkbox_changes);
			const typography6_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				typography6_changes.$$scope = { dirty, ctx };
			}

			typography6.$set(typography6_changes);
			const typography7_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				typography7_changes.$$scope = { dirty, ctx };
			}

			typography7.$set(typography7_changes);
			const card_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				card_changes.$$scope = { dirty, ctx };
			}

			card.$set(card_changes);
			const typography8_changes = {};

			if (dirty & /*$$scope*/ 65536) {
				typography8_changes.$$scope = { dirty, ctx };
			}

			typography8.$set(typography8_changes);
		},
		i(local) {
			if (current) return;
			transition_in(typography0.$$.fragment, local);
			transition_in(typography1.$$.fragment, local);

			for (let i = 0; i < 5; i += 1) {
				transition_in(each_blocks_5[i]);
			}

			transition_in(typography2.$$.fragment, local);

			for (let i = 0; i < 4; i += 1) {
				transition_in(each_blocks_4[i]);
			}

			transition_in(typography3.$$.fragment, local);

			for (let i = 0; i < 4; i += 1) {
				transition_in(each_blocks_3[i]);
			}

			transition_in(input.$$.fragment, local);
			transition_in(typography4.$$.fragment, local);

			for (let i = 0; i < 3; i += 1) {
				transition_in(each_blocks_2[i]);
			}

			transition_in(typography5.$$.fragment, local);
			transition_in(checkbox.$$.fragment, local);
			transition_in(typography6.$$.fragment, local);

			for (let i = 0; i < 6; i += 1) {
				transition_in(each_blocks_1[i]);
			}

			transition_in(typography7.$$.fragment, local);
			transition_in(card.$$.fragment, local);
			transition_in(typography8.$$.fragment, local);

			for (let i = 0; i < 12; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			transition_out(typography0.$$.fragment, local);
			transition_out(typography1.$$.fragment, local);
			each_blocks_5 = each_blocks_5.filter(Boolean);

			for (let i = 0; i < 5; i += 1) {
				transition_out(each_blocks_5[i]);
			}

			transition_out(typography2.$$.fragment, local);
			each_blocks_4 = each_blocks_4.filter(Boolean);

			for (let i = 0; i < 4; i += 1) {
				transition_out(each_blocks_4[i]);
			}

			transition_out(typography3.$$.fragment, local);
			each_blocks_3 = each_blocks_3.filter(Boolean);

			for (let i = 0; i < 4; i += 1) {
				transition_out(each_blocks_3[i]);
			}

			transition_out(input.$$.fragment, local);
			transition_out(typography4.$$.fragment, local);
			each_blocks_2 = each_blocks_2.filter(Boolean);

			for (let i = 0; i < 3; i += 1) {
				transition_out(each_blocks_2[i]);
			}

			transition_out(typography5.$$.fragment, local);
			transition_out(checkbox.$$.fragment, local);
			transition_out(typography6.$$.fragment, local);
			each_blocks_1 = each_blocks_1.filter(Boolean);

			for (let i = 0; i < 6; i += 1) {
				transition_out(each_blocks_1[i]);
			}

			transition_out(typography7.$$.fragment, local);
			transition_out(card.$$.fragment, local);
			transition_out(typography8.$$.fragment, local);
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < 12; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) detach(div0);
			destroy_component(typography0);
			if (detaching) detach(t0);
			if (detaching) detach(span0);
			destroy_component(typography1);
			if (detaching) detach(t1);
			if (detaching) detach(br);
			if (detaching) detach(t2);
			if (detaching) detach(div1);
			destroy_each(each_blocks_5, detaching);
			if (detaching) detach(t3);
			if (detaching) detach(span1);
			destroy_component(typography2);
			if (detaching) detach(t4);
			if (detaching) detach(div2);
			destroy_each(each_blocks_4, detaching);
			if (detaching) detach(t5);
			if (detaching) detach(span2);
			destroy_component(typography3);
			if (detaching) detach(t6);
			if (detaching) detach(div3);
			destroy_each(each_blocks_3, detaching);
			destroy_component(input);
			if (detaching) detach(t8);
			if (detaching) detach(span3);
			destroy_component(typography4);
			if (detaching) detach(t9);
			if (detaching) detach(div4);
			destroy_each(each_blocks_2, detaching);
			if (detaching) detach(t10);
			if (detaching) detach(span4);
			destroy_component(typography5);
			if (detaching) detach(t11);
			if (detaching) detach(div5);
			destroy_component(checkbox);
			if (detaching) detach(t12);
			if (detaching) detach(span5);
			destroy_component(typography6);
			if (detaching) detach(t13);
			if (detaching) detach(div6);
			destroy_each(each_blocks_1, detaching);
			if (detaching) detach(t14);
			if (detaching) detach(span6);
			destroy_component(typography7);
			if (detaching) detach(t15);
			if (detaching) detach(div7);
			destroy_component(card);
			if (detaching) detach(t16);
			if (detaching) detach(span7);
			destroy_component(typography8);
			if (detaching) detach(t17);
			if (detaching) detach(div8);
			destroy_each(each_blocks, detaching);
			mounted = false;
			dispose();
		}
	};
}

function create_fragment(ctx) {
	let supabaseui;
	let current;

	supabaseui = new SupabaseUi({
			props: {
				theme: /*theme*/ ctx[0],
				$$slots: { default: [create_default_slot] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(supabaseui.$$.fragment);
		},
		m(target, anchor) {
			mount_component(supabaseui, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const supabaseui_changes = {};
			if (dirty & /*theme*/ 1) supabaseui_changes.theme = /*theme*/ ctx[0];

			if (dirty & /*$$scope, theme*/ 65537) {
				supabaseui_changes.$$scope = { dirty, ctx };
			}

			supabaseui.$set(supabaseui_changes);
		},
		i(local) {
			if (current) return;
			transition_in(supabaseui.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(supabaseui.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(supabaseui, detaching);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let theme;

	const click_handler = () => {
		if (theme == "dark") {
			$$invalidate(0, theme = "light");
		} else {
			$$invalidate(0, theme = "dark");
		}

		console.log("clicied");
	};

	return [theme, click_handler];
}

class App extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, {});
	}
}

const app = new App({
  target: document.body,
});

export { app as default };
