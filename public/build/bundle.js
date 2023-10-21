
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
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
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Retrieves the context that belongs to the closest parent component with the specified `key`.
     * Must be called during component initialisation.
     *
     * https://svelte.dev/docs#run-time-svelte-getcontext
     */
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
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
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
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
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
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
        else if (callback) {
            callback();
        }
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        const updates = [];
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                // defer updates until all the DOM shuffling is done
                updates.push(() => block.p(child_ctx, dirty));
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        run_all(updates);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
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
            flush_render_callbacks($$.after_update);
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
            ctx: [],
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
            if (!is_function(callback)) {
                return noop;
            }
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/Header.svelte generated by Svelte v3.59.2 */

    const file$5 = "src/components/Header.svelte";

    function create_fragment$5(ctx) {
    	let nav;
    	let div1;
    	let a0;
    	let t1;
    	let button;
    	let i0;
    	let t2;
    	let div0;
    	let ul0;
    	let li0;
    	let a1;
    	let t4;
    	let ul1;
    	let li1;
    	let a2;
    	let i1;
    	let t5;
    	let li2;
    	let a3;
    	let i2;

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div1 = element("div");
    			a0 = element("a");
    			a0.textContent = "EsportsNews";
    			t1 = space();
    			button = element("button");
    			i0 = element("i");
    			t2 = space();
    			div0 = element("div");
    			ul0 = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			a1.textContent = "Live Events";
    			t4 = space();
    			ul1 = element("ul");
    			li1 = element("li");
    			a2 = element("a");
    			i1 = element("i");
    			t5 = space();
    			li2 = element("li");
    			a3 = element("a");
    			i2 = element("i");
    			attr_dev(a0, "class", "navbar-brand");
    			attr_dev(a0, "href", "/");
    			add_location(a0, file$5, 3, 4, 95);
    			attr_dev(i0, "class", "fas fa-bars");
    			add_location(i0, file$5, 7, 6, 368);
    			attr_dev(button, "class", "navbar-toggler");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "data-mdb-toggle", "collapse");
    			attr_dev(button, "aria-label", "Toggle navigation");
    			attr_dev(button, "aria-controls", "navbarSupportedContent");
    			attr_dev(button, "aria-expanded", "false");
    			attr_dev(button, "data-mdb-target", "#navbarSupportedContent");
    			add_location(button, file$5, 5, 4, 149);
    			attr_dev(a1, "class", "nav-link text-white");
    			attr_dev(a1, "href", "/live");
    			add_location(a1, file$5, 13, 10, 573);
    			attr_dev(li0, "class", "nav-item");
    			add_location(li0, file$5, 12, 8, 541);
    			attr_dev(ul0, "class", "navbar-nav me-auto mb-2 mb-lg-0");
    			add_location(ul0, file$5, 11, 6, 488);
    			attr_dev(i1, "class", "bi bi-twitch");
    			add_location(i1, file$5, 19, 50, 804);
    			attr_dev(a2, "class", "nav-link text-white");
    			attr_dev(a2, "href", "/");
    			add_location(a2, file$5, 19, 10, 764);
    			attr_dev(li1, "class", "nav-item me-3 me-lg-0");
    			add_location(li1, file$5, 18, 8, 719);
    			attr_dev(i2, "class", "bi bi-twitter");
    			add_location(i2, file$5, 22, 50, 944);
    			attr_dev(a3, "class", "nav-link text-white");
    			attr_dev(a3, "href", "/");
    			add_location(a3, file$5, 22, 10, 904);
    			attr_dev(li2, "class", "nav-item me-3 me-lg-0");
    			add_location(li2, file$5, 21, 8, 859);
    			attr_dev(ul1, "class", "navbar-nav d-flex flex-row me-1");
    			add_location(ul1, file$5, 17, 6, 666);
    			attr_dev(div0, "class", "collapse navbar-collapse");
    			attr_dev(div0, "id", "navbarSupportedContent");
    			add_location(div0, file$5, 10, 4, 415);
    			attr_dev(div1, "class", "container-fluid");
    			add_location(div1, file$5, 2, 2, 61);
    			attr_dev(nav, "class", "navbar navbar-expand-lg bg-dark navbar-dark");
    			add_location(nav, file$5, 1, 0, 1);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div1);
    			append_dev(div1, a0);
    			append_dev(div1, t1);
    			append_dev(div1, button);
    			append_dev(button, i0);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a1);
    			append_dev(div0, t4);
    			append_dev(div0, ul1);
    			append_dev(ul1, li1);
    			append_dev(li1, a2);
    			append_dev(a2, i1);
    			append_dev(ul1, t5);
    			append_dev(ul1, li2);
    			append_dev(li2, a3);
    			append_dev(a3, i2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/Footer.svelte generated by Svelte v3.59.2 */

    const file$4 = "src/components/Footer.svelte";

    function create_fragment$4(ctx) {
    	let footer;
    	let div0;
    	let section;
    	let a0;
    	let i0;
    	let t0;
    	let a1;
    	let i1;
    	let t1;
    	let div1;
    	let t2;
    	let a2;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			div0 = element("div");
    			section = element("section");
    			a0 = element("a");
    			i0 = element("i");
    			t0 = space();
    			a1 = element("a");
    			i1 = element("i");
    			t1 = space();
    			div1 = element("div");
    			t2 = text("© 2023 Copyright:\n    ");
    			a2 = element("a");
    			a2.textContent = "ESportsmag.org";
    			attr_dev(i0, "class", "bi bi-twitter");
    			add_location(i0, file$4, 5, 8, 245);
    			attr_dev(a0, "class", "btn btn-link btn-floating btn-lg text-white m-1");
    			attr_dev(a0, "href", "https://twitter.com/");
    			attr_dev(a0, "role", "button");
    			attr_dev(a0, "data-mdb-ripple-color", "white");
    			add_location(a0, file$4, 4, 6, 105);
    			attr_dev(i1, "class", "bi bi-twitch");
    			add_location(i1, file$4, 8, 8, 430);
    			attr_dev(a1, "class", "btn btn-link btn-floating btn-lg text-white m-1");
    			attr_dev(a1, "href", "https://twitch.tv/");
    			attr_dev(a1, "role", "button");
    			attr_dev(a1, "data-mdb-ripple-color", "white");
    			add_location(a1, file$4, 7, 6, 292);
    			attr_dev(section, "class", "mb-4");
    			add_location(section, file$4, 3, 4, 76);
    			attr_dev(div0, "class", "container pt-4");
    			add_location(div0, file$4, 2, 2, 43);
    			attr_dev(a2, "class", "text-white");
    			attr_dev(a2, "href", "https://esportsmag.org");
    			add_location(a2, file$4, 14, 4, 563);
    			attr_dev(div1, "class", "text-center text-white p-3");
    			add_location(div1, file$4, 12, 2, 496);
    			attr_dev(footer, "class", "text-center text-white");
    			add_location(footer, file$4, 1, 0, 1);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div0);
    			append_dev(div0, section);
    			append_dev(section, a0);
    			append_dev(a0, i0);
    			append_dev(section, t0);
    			append_dev(section, a1);
    			append_dev(a1, i1);
    			append_dev(footer, t1);
    			append_dev(footer, div1);
    			append_dev(div1, t2);
    			append_dev(div1, a2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Footer', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/Icon.svelte generated by Svelte v3.59.2 */

    const file$3 = "src/components/Icon.svelte";

    function create_fragment$3(ctx) {
    	let svg;
    	let ellipse0;
    	let ellipse1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			ellipse0 = svg_element("ellipse");
    			ellipse1 = svg_element("ellipse");
    			attr_dev(ellipse0, "cx", "150");
    			attr_dev(ellipse0, "cy", "115.654");
    			attr_dev(ellipse0, "rx", "12.676");
    			attr_dev(ellipse0, "ry", "12.676");
    			add_location(ellipse0, file$3, 5, 2, 153);
    			attr_dev(ellipse1, "cx", "150");
    			attr_dev(ellipse1, "cy", "163.7");
    			attr_dev(ellipse1, "rx", "12.676");
    			attr_dev(ellipse1, "ry", "12.676");
    			add_location(ellipse1, file$3, 6, 2, 213);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 300 300");
    			set_style(svg, "width", /*size*/ ctx[0] + "px");
    			set_style(svg, "height", /*size*/ ctx[0] + "px");
    			add_location(svg, file$3, 4, 0, 45);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, ellipse0);
    			append_dev(svg, ellipse1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*size*/ 1) {
    				set_style(svg, "width", /*size*/ ctx[0] + "px");
    			}

    			if (dirty & /*size*/ 1) {
    				set_style(svg, "height", /*size*/ ctx[0] + "px");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Icon', slots, []);
    	let { size = 324 } = $$props;
    	const writable_props = ['size'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Icon> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('size' in $$props) $$invalidate(0, size = $$props.size);
    	};

    	$$self.$capture_state = () => ({ size });

    	$$self.$inject_state = $$props => {
    		if ('size' in $$props) $$invalidate(0, size = $$props.size);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [size];
    }

    class Icon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { size: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Icon",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get size() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/News.svelte generated by Svelte v3.59.2 */

    const { console: console_1$1 } = globals;
    const file$2 = "src/components/News.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (119:0) {#if !loading}
    function create_if_block_1(ctx) {
    	let div1;
    	let img;
    	let img_src_value;
    	let t0;
    	let div0;
    	let h1;
    	let t2;
    	let div2;
    	let h2;
    	let t4;
    	let hr;
    	let t5;
    	let div4;
    	let div3;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_value = /*currentEntries*/ ctx[3];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*entry*/ ctx[11].uid;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Welcome to LeagueMag";
    			t2 = space();
    			div2 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Latest news";
    			t4 = space();
    			hr = element("hr");
    			t5 = space();
    			div4 = element("div");
    			div3 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(img, "class", "card-img-top");
    			if (!src_url_equal(img.src, img_src_value = "https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blte299f23c6e55ebed/63bcad4899e03c1edced9b6f/VAL_Ep6_Homepage-CG-Still.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			set_style(img, "object-fit", "cover");
    			set_style(img, "height", "102%");
    			set_style(img, "width", "100%");
    			add_location(img, file$2, 121, 2, 3524);
    			add_location(h1, file$2, 123, 4, 3943);
    			attr_dev(div0, "class", "welcome-text");
    			set_style(div0, "position", "absolute");
    			set_style(div0, "top", "54%");
    			set_style(div0, "left", "50%");
    			set_style(div0, "transform", "translate(-50%, -50%)");
    			set_style(div0, "color", "white");
    			set_style(div0, "text-align", "center");
    			set_style(div0, "font-family", "'Bebas Neue', sans-serif");
    			add_location(div0, file$2, 122, 2, 3756);
    			attr_dev(div1, "class", "HomeHero");
    			set_style(div1, "height", "500px");
    			set_style(div1, "position", "relative");
    			add_location(div1, file$2, 120, 10, 3456);
    			add_location(h2, file$2, 127, 2, 4022);
    			add_location(hr, file$2, 128, 2, 4045);
    			attr_dev(div2, "class", "et_pb_text_inner");
    			add_location(div2, file$2, 126, 0, 3989);
    			attr_dev(div3, "class", "row g-4");
    			add_location(div3, file$2, 131, 2, 4088);
    			attr_dev(div4, "class", "news-container svelte-p4ciyx");
    			add_location(div4, file$2, 130, 0, 4057);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h2);
    			append_dev(div2, t4);
    			append_dev(div2, hr);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div3, null);
    				}
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentEntries*/ 8) {
    				each_value = /*currentEntries*/ ctx[3];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div3, destroy_block, create_each_block, null, get_each_context);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(119:0) {#if !loading}",
    		ctx
    	});

    	return block;
    }

    // (145:47) 
    function create_if_block_3(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "header");
    			set_style(div, "background-image", "url('" + (/*entry*/ ctx[11].thumbnail_high || /*entry*/ ctx[11].thumbnail_low) + "')");
    			add_location(div, file$2, 145, 14, 4870);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentEntries*/ 8) {
    				set_style(div, "background-image", "url('" + (/*entry*/ ctx[11].thumbnail_high || /*entry*/ ctx[11].thumbnail_low) + "')");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(145:47) ",
    		ctx
    	});

    	return block;
    }

    // (143:12) {#if entry.type === 'article' && entry.header_image}
    function create_if_block_2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "header");
    			set_style(div, "background-image", "url('" + (/*entry*/ ctx[11].header_image.url || 'default_image_url') + "')");
    			add_location(div, file$2, 143, 14, 4699);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentEntries*/ 8) {
    				set_style(div, "background-image", "url('" + (/*entry*/ ctx[11].header_image.url || 'default_image_url') + "')");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(143:12) {#if entry.type === 'article' && entry.header_image}",
    		ctx
    	});

    	return block;
    }

    // (133:4) {#each currentEntries as entry (entry.uid)}
    function create_each_block(key_1, ctx) {
    	let div5;
    	let div4;
    	let a;
    	let t0;
    	let div3;
    	let div0;
    	let t1_value = /*entry*/ ctx[11].type + "";
    	let t1;
    	let t2;
    	let div2;
    	let div1;
    	let t3_value = /*entry*/ ctx[11].title + "";
    	let t3;
    	let t4;
    	let p;
    	let small;
    	let t5_value = /*entry*/ ctx[11].created_at + "";
    	let t5;
    	let a_href_value;
    	let t6;

    	function select_block_type(ctx, dirty) {
    		if (/*entry*/ ctx[11].type === 'article' && /*entry*/ ctx[11].header_image) return create_if_block_2;
    		if (/*entry*/ ctx[11].type !== 'article') return create_if_block_3;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div5 = element("div");
    			div4 = element("div");
    			a = element("a");
    			if (if_block) if_block.c();
    			t0 = space();
    			div3 = element("div");
    			div0 = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			div2 = element("div");
    			div1 = element("div");
    			t3 = text(t3_value);
    			t4 = space();
    			p = element("p");
    			small = element("small");
    			t5 = text(t5_value);
    			t6 = space();
    			attr_dev(div0, "class", "content-type");
    			add_location(div0, file$2, 148, 14, 5047);
    			attr_dev(div1, "class", "text");
    			add_location(div1, file$2, 150, 16, 5142);
    			attr_dev(small, "class", "text-createdat");
    			add_location(small, file$2, 152, 16, 5234);
    			attr_dev(p, "class", "card-text");
    			add_location(p, file$2, 151, 16, 5196);
    			attr_dev(div2, "class", "title");
    			add_location(div2, file$2, 149, 14, 5106);
    			attr_dev(div3, "class", "description");
    			add_location(div3, file$2, 147, 12, 5007);
    			attr_dev(a, "class", "content-block article");

    			attr_dev(a, "href", a_href_value = /*entry*/ ctx[11].type === 'article'
    			? /*entry*/ ctx[11].external_link?.url || `https://lolesports.com/article/${/*entry*/ ctx[11].uid}`
    			: /*entry*/ ctx[11].video_id
    				? `https://lolesports.com/video/${/*entry*/ ctx[11].video_id}`
    				: `https://lolesports.com/video/${/*entry*/ ctx[11].uid}`);

    			attr_dev(a, "target", "_self");
    			add_location(a, file$2, 135, 10, 4263);
    			attr_dev(div4, "class", "card svelte-p4ciyx");
    			set_style(div4, "background-color", "transparent");
    			add_location(div4, file$2, 134, 8, 4195);
    			attr_dev(div5, "class", "col-md-6");
    			add_location(div5, file$2, 133, 6, 4164);
    			this.first = div5;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, a);
    			if (if_block) if_block.m(a, null);
    			append_dev(a, t0);
    			append_dev(a, div3);
    			append_dev(div3, div0);
    			append_dev(div0, t1);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, t3);
    			append_dev(div2, t4);
    			append_dev(div2, p);
    			append_dev(p, small);
    			append_dev(small, t5);
    			append_dev(div5, t6);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(a, t0);
    				}
    			}

    			if (dirty & /*currentEntries*/ 8 && t1_value !== (t1_value = /*entry*/ ctx[11].type + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*currentEntries*/ 8 && t3_value !== (t3_value = /*entry*/ ctx[11].title + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*currentEntries*/ 8 && t5_value !== (t5_value = /*entry*/ ctx[11].created_at + "")) set_data_dev(t5, t5_value);

    			if (dirty & /*currentEntries*/ 8 && a_href_value !== (a_href_value = /*entry*/ ctx[11].type === 'article'
    			? /*entry*/ ctx[11].external_link?.url || `https://lolesports.com/article/${/*entry*/ ctx[11].uid}`
    			: /*entry*/ ctx[11].video_id
    				? `https://lolesports.com/video/${/*entry*/ ctx[11].video_id}`
    				: `https://lolesports.com/video/${/*entry*/ ctx[11].uid}`)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);

    			if (if_block) {
    				if_block.d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(133:4) {#each currentEntries as entry (entry.uid)}",
    		ctx
    	});

    	return block;
    }

    // (165:0) {#if entries.length > visibleEntries}
    function create_if_block$2(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "LOAD MORE";
    			attr_dev(div0, "class", "load-more-button");
    			attr_dev(div0, "role", "button");
    			add_location(div0, file$2, 167, 4, 5534);
    			attr_dev(div1, "class", "load-more");
    			add_location(div1, file$2, 166, 2, 5506);
    			attr_dev(div2, "class", "load-more-container");
    			add_location(div2, file$2, 165, 0, 5470);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", /*handleLoadMore*/ ctx[4], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(165:0) {#if entries.length > visibleEntries}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let t;
    	let if_block1_anchor;
    	let if_block0 = !/*loading*/ ctx[1] && create_if_block_1(ctx);
    	let if_block1 = /*entries*/ ctx[0].length > /*visibleEntries*/ ctx[2] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (!/*loading*/ ctx[1]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(t.parentNode, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*entries*/ ctx[0].length > /*visibleEntries*/ ctx[2]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('News', slots, []);
    	let entries = [];
    	let loading = true;
    	let visibleEntries = 14;
    	let skipEntries = 0;
    	let selectedCategories = [];

    	const shuffleArray = array => {
    		for (let i = array.length - 1; i > 0; i--) {
    			const j = Math.floor(Math.random() * (i + 1));
    			[array[i], array[j]] = [array[j], array[i]];
    		}

    		return array;
    	};

    	onMount(async () => {
    		try {
    			const articles = [];
    			const videos = [];

    			for (let i = 0; i <= 600; i += 100) {
    				const response = await fetch(`https://wrapper-eight.vercel.app/articles/${i}`, {
    					headers: {
    						'Access_token': 'cs9bf74a8cc357da4224f2b444',
    						'Api_key': 'bltad9188aa9a70543a'
    					}
    				});

    				const data = await response.json();
    				articles.push(...data.entries.map(entry => ({ ...entry, type: 'article' })));
    			}

    			for (let i = 0; i <= 900; i += 100) {
    				const response = await fetch(`https://wrapper-eight.vercel.app/videos/${i}`, {
    					headers: {
    						'Access_token': 'cs9bf74a8cc357da4224f2b444',
    						'Api_key': 'bltad9188aa9a70543a'
    					}
    				});

    				const data = await response.json();
    				videos.push(...data.entries.map(entry => ({ ...entry, type: 'video' })));
    			}

    			const combinedEntries = [...articles, ...videos];
    			$$invalidate(0, entries = shuffleArray(combinedEntries));
    			$$invalidate(1, loading = false);
    			updateVisibleEntries();
    		} catch(error) {
    			console.log(error);
    		}
    	});

    	let currentEntries = [];

    	const handleLoadMore = () => {
    		$$invalidate(2, visibleEntries += 14);

    		if (visibleEntries >= entries.length) {
    			skipEntries += 100;
    			loadMoreEntries();
    		} else {
    			updateVisibleEntries();
    		}
    	};

    	const applyFilter = () => {
    		$$invalidate(2, visibleEntries = 14);
    		updateVisibleEntries();
    	};

    	const updateVisibleEntries = () => {
    		let filteredEntries = entries;

    		if (selectedCategories.length > 0) {
    			filteredEntries = entries.filter(entry => selectedCategories.includes(entry.type));
    		}

    		$$invalidate(3, currentEntries = filteredEntries.slice(0, visibleEntries).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    	};

    	const shareOnTwitter = (entry, text) => {
    		let shareUrl = '';

    		if (entry && entry.type === 'article') {
    			if (entry.external_link && entry.external_link.url) {
    				shareUrl = entry.external_link.url;
    			} else {
    				shareUrl = `https://lolesports.com/article/${encodeURIComponent(entry.title)}/${encodeURIComponent(entry.uid)}`;
    			}
    		} else if (entry && entry.type === 'video') {
    			if (entry.video_id) {
    				shareUrl = `https://lolesports.com/video/${encodeURIComponent(entry.video_id)}`;
    			} else {
    				shareUrl = `https://lolesports.com/video/${encodeURIComponent(entry.uid)}`;
    			}
    		}

    		if (shareUrl) {
    			const encodedUrl = encodeURIComponent(shareUrl);
    			const encodedText = encodeURIComponent(text);
    			const twitterShareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
    			const windowOptions = 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=420,width=550';
    			window.open(twitterShareUrl, '_blank', windowOptions);
    		} else {
    			console.log('Share URL is not available.');
    		}
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<News> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		entries,
    		loading,
    		visibleEntries,
    		skipEntries,
    		selectedCategories,
    		shuffleArray,
    		currentEntries,
    		handleLoadMore,
    		applyFilter,
    		updateVisibleEntries,
    		shareOnTwitter
    	});

    	$$self.$inject_state = $$props => {
    		if ('entries' in $$props) $$invalidate(0, entries = $$props.entries);
    		if ('loading' in $$props) $$invalidate(1, loading = $$props.loading);
    		if ('visibleEntries' in $$props) $$invalidate(2, visibleEntries = $$props.visibleEntries);
    		if ('skipEntries' in $$props) skipEntries = $$props.skipEntries;
    		if ('selectedCategories' in $$props) selectedCategories = $$props.selectedCategories;
    		if ('currentEntries' in $$props) $$invalidate(3, currentEntries = $$props.currentEntries);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [entries, loading, visibleEntries, currentEntries, handleLoadMore];
    }

    class News extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "News",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/Article.svelte generated by Svelte v3.59.2 */

    const { console: console_1 } = globals;
    const file$1 = "src/components/Article.svelte";

    // (28:2) {:else}
    function create_else_block$1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Loading...";
    			add_location(p, file$1, 28, 4, 728);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(28:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (25:2) {#if articleData}
    function create_if_block$1(ctx) {
    	let h1;
    	let t_value = /*articleData*/ ctx[0].title + "";
    	let t;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t = text(t_value);
    			add_location(h1, file$1, 25, 4, 648);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*articleData*/ 1 && t_value !== (t_value = /*articleData*/ ctx[0].title + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(25:2) {#if articleData}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (/*articleData*/ ctx[0]) return create_if_block$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			add_location(div, file$1, 23, 0, 618);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Article', slots, []);
    	let articleData = null;
    	const params = getContext('params');

    	onMount(async () => {
    		try {
    			// Extract the UID parameter from the route
    			const { uid } = params.entry.uid;

    			const response = await fetch(`https://cdn.contentstack.io/v3/content_types/articles/entries/${uid}?environment=production&bustcache=bustcache&locale=en-gb&include[]=league&include[]=author`);
    			$$invalidate(0, articleData = await response.json());
    		} catch(error) {
    			console.log(error);
    		}
    	});

    	console.log(articleData);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Article> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ onMount, getContext, articleData, params });

    	$$self.$inject_state = $$props => {
    		if ('articleData' in $$props) $$invalidate(0, articleData = $$props.articleData);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [articleData];
    }

    class Article extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Article",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/components/App.svelte generated by Svelte v3.59.2 */
    const file = "src/components/App.svelte";

    // (28:8) {:else}
    function create_else_block(ctx) {
    	let div;
    	let news;
    	let current;
    	news = new News({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(news.$$.fragment);
    			attr_dev(div, "class", "col my-3");
    			add_location(div, file, 28, 10, 595);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(news, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(news.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(news.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(news);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(28:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (24:8) {#if isLoading}
    function create_if_block(ctx) {
    	let div;
    	let icon;
    	let current;
    	icon = new Icon({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(icon.$$.fragment);
    			attr_dev(div, "class", "spinner");
    			add_location(div, file, 24, 10, 509);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(icon, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(icon);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(24:8) {#if isLoading}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div3;
    	let header;
    	let t0;
    	let div2;
    	let div1;
    	let div0;
    	let current_block_type_index;
    	let if_block;
    	let t1;
    	let footer;
    	let current;
    	header = new Header({ $$inline: true });
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*isLoading*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			create_component(header.$$.fragment);
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			if_block.c();
    			t1 = space();
    			create_component(footer.$$.fragment);
    			attr_dev(div0, "class", "row");
    			add_location(div0, file, 22, 6, 457);
    			attr_dev(div1, "class", "container");
    			add_location(div1, file, 21, 4, 427);
    			attr_dev(div2, "class", "main-content");
    			add_location(div2, file, 20, 2, 396);
    			attr_dev(div3, "class", "App");
    			add_location(div3, file, 17, 0, 362);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			mount_component(header, div3, null);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			if_blocks[current_block_type_index].m(div0, null);
    			append_dev(div3, t1);
    			mount_component(footer, div3, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div0, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(if_block);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(if_block);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_component(header);
    			if_blocks[current_block_type_index].d();
    			destroy_component(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let isLoading = true;

    	onMount(() => {
    		setTimeout(
    			() => {
    				$$invalidate(0, isLoading = false);
    			},
    			1800
    		);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		Header,
    		Footer,
    		Icon,
    		News,
    		Article,
    		isLoading
    	});

    	$$self.$inject_state = $$props => {
    		if ('isLoading' in $$props) $$invalidate(0, isLoading = $$props.isLoading);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [isLoading];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
