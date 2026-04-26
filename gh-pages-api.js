/* Browser-only API emulation for GitHub Pages. */
(function () {
  var STORAGE_KEY = "telega_store_v1";

  function now() {
    return Date.now() / 1000;
  }

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (_err) {
      return fallback;
    }
  }

  function loadStore() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        users: {},
        passwords: {},
        friends: {},
        friend_requests: {},
        messages: {},
        groups: {},
        group_messages: {},
        calls: {}
      };
    }
    var parsed = safeJsonParse(raw, null);
    if (!parsed || typeof parsed !== "object") {
      return {
        users: {},
        passwords: {},
        friends: {},
        friend_requests: {},
        messages: {},
        groups: {},
        group_messages: {},
        calls: {}
      };
    }
    return Object.assign(
      {
        users: {},
        passwords: {},
        friends: {},
        friend_requests: {},
        messages: {},
        groups: {},
        group_messages: {},
        calls: {}
      },
      parsed
    );
  }

  function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return "msg_" + Math.random().toString(16).slice(2) + "_" + Date.now();
  }

  function keyForUsers(a, b) {
    return [String(a || "").toLowerCase(), String(b || "").toLowerCase()].sort().join("|||");
  }

  function asJsonResponse(body, status) {
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: status || 200,
        headers: { "Content-Type": "application/json" }
      })
    );
  }

  function parseBody(options) {
    if (!options || !options.body) {
      return {};
    }
    if (typeof options.body === "string") {
      return safeJsonParse(options.body, {});
    }
    return options.body || {};
  }

  function getUserDisplay(users, username) {
    var user = users[username] || {};
    return user.displayName || username;
  }

  function ensureFriendArray(store, username) {
    if (!store.friends[username]) {
      store.friends[username] = [];
    }
  }

  function handleGet(pathname, params, store) {
    if (pathname === "/api/users") {
      var query = String(params.get("q") || "").toLowerCase();
      var currentUser = String(params.get("user") || "").toLowerCase();
      var userFriends = store.friends[currentUser] || [];
      var result = [];
      Object.keys(store.users).forEach(function (u) {
        if (u === currentUser || userFriends.indexOf(u) !== -1) return;
        var item = store.users[u] || {};
        var display = item.displayName || u;
        if (!query || u.indexOf(query) !== -1 || String(display).toLowerCase().indexOf(query) !== -1) {
          result.push({
            username: u,
            online: !!item.online,
            displayName: display,
            avatar: item.avatar || ""
          });
        }
      });
      return asJsonResponse({ users: result });
    }

    if (pathname === "/api/user") {
      var target = String(params.get("username") || "").toLowerCase();
      var targetData = store.users[target] || {};
      return asJsonResponse({
        username: target,
        displayName: targetData.displayName || target,
        online: !!targetData.online,
        avatar: targetData.avatar || ""
      });
    }

    if (pathname === "/api/friends") {
      var username = String(params.get("user") || "").toLowerCase();
      var friendList = (store.friends[username] || []).map(function (friend) {
        var userData = store.users[friend] || {};
        return {
          username: friend,
          online: !!userData.online,
          displayName: userData.displayName || friend,
          avatar: userData.avatar || ""
        };
      });
      return asJsonResponse({ friends: friendList });
    }

    if (pathname === "/api/friend/requests") {
      var reqUser = String(params.get("user") || "").toLowerCase();
      return asJsonResponse({ requests: store.friend_requests[reqUser] || [] });
    }

    if (pathname === "/api/messages") {
      var user1 = String(params.get("user1") || "").toLowerCase();
      var user2 = String(params.get("user2") || "").toLowerCase();
      if (!user1 || !user2) return asJsonResponse({ messages: [] });
      var relKey = keyForUsers(user1, user2);
      var msgs = store.messages[relKey] || [];
      var filtered = msgs.filter(function (m) {
        return !(m.deleted_for_sender && m.sender === user1);
      });
      return asJsonResponse({ messages: filtered });
    }

    if (pathname === "/api/group/list") {
      var groupUser = String(params.get("user") || "").toLowerCase();
      var groups = Object.keys(store.groups)
        .filter(function (name) {
          return (store.groups[name].members || []).indexOf(groupUser) !== -1;
        })
        .map(function (name) {
          return {
            name: name,
            members: store.groups[name].members || []
          };
        });
      return asJsonResponse({ groups: groups });
    }

    if (pathname === "/api/group/messages") {
      var groupName = String(params.get("group") || "");
      return asJsonResponse({ messages: store.group_messages[groupName] || [] });
    }

    if (pathname === "/api/group/info") {
      var infoName = String(params.get("name") || "");
      var info = store.groups[infoName] || {};
      return asJsonResponse({
        name: infoName,
        members: info.members || [],
        avatar: info.avatar || ""
      });
    }

    if (pathname === "/api/call/status") {
      var callUser = String(params.get("user") || "").toLowerCase();
      var call = store.calls[callUser];
      if (call && now() - (call.time || 0) < 30) {
        return asJsonResponse({ call: call });
      }
      return asJsonResponse({ call: null });
    }

    return null;
  }

  function handlePost(pathname, body, store) {
    if (pathname === "/api/register") {
      var username = String(body.username || "").trim().toLowerCase();
      var password = String(body.password || "").trim();
      if (!username || !password) {
        return asJsonResponse({ ok: false, error: "Missing username or password" }, 400);
      }
      if (store.passwords[username]) {
        return asJsonResponse({ ok: false, error: "Username already exists" }, 400);
      }
      store.passwords[username] = password;
      store.users[username] = { online: true, created: now(), displayName: username };
      ensureFriendArray(store, username);
      saveStore(store);
      return asJsonResponse({ ok: true, username: username });
    }

    if (pathname === "/api/login") {
      var loginUser = String(body.username || "").trim().toLowerCase();
      var loginPass = String(body.password || "").trim();
      if (!loginUser) return asJsonResponse({ ok: false, error: "Введи никнейм" }, 400);
      if (!loginPass) return asJsonResponse({ ok: false, error: "Введи пароль" }, 400);
      if (store.passwords[loginUser] !== loginPass) {
        return asJsonResponse({ ok: false, error: "Неверный никнейм или пароль" }, 401);
      }
      if (!store.users[loginUser]) store.users[loginUser] = { created: now(), displayName: loginUser };
      store.users[loginUser].online = true;
      ensureFriendArray(store, loginUser);
      saveStore(store);
      return asJsonResponse({ ok: true, username: loginUser });
    }

    if (pathname === "/api/settings") {
      var settingsUser = String(body.username || "").toLowerCase();
      var settings = body.settings || {};
      if (store.users[settingsUser]) {
        store.users[settingsUser].theme = settings.theme || "";
        store.users[settingsUser].avatar = settings.avatar || "";
        store.users[settingsUser].sound = settings.sound !== false;
        store.users[settingsUser].vibrate = settings.vibrate !== false;
        store.users[settingsUser].soundType = settings.soundType || "default";
        store.users[settingsUser].customSound = settings.customSound || "";
      }
      saveStore(store);
      return asJsonResponse({ ok: true, settings: store.users[settingsUser] || {} });
    }

    if (pathname === "/api/send") {
      var sender = String(body.sender || "").toLowerCase();
      var recipient = String(body.recipient || "").toLowerCase();
      if (!sender || !recipient) return asJsonResponse({ ok: false, error: "Missing sender or recipient" }, 400);
      var relKey = keyForUsers(sender, recipient);
      if (!store.messages[relKey]) store.messages[relKey] = [];
      var message = { id: uuid(), sender: sender, timestamp: now() };
      if (body.text) message.text = body.text;
      if (body.type) message.type = body.type;
      if (body.data) message.data = body.data;
      store.messages[relKey].push(message);
      saveStore(store);
      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/message/delete") {
      var user1 = String(body.user1 || "").toLowerCase();
      var user2 = String(body.user2 || "").toLowerCase();
      var idx = Number(body.idx);
      var where = body.where || "me";
      var relKey2 = keyForUsers(user1, user2);
      var arr = store.messages[relKey2] || [];
      if (!Number.isNaN(idx) && idx >= 0 && idx < arr.length) {
        if (where === "both") arr.splice(idx, 1);
        else arr[idx].deleted_for_sender = true;
      }
      saveStore(store);
      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/group") {
      var name = String(body.name || "").trim();
      var members = Array.isArray(body.members) ? body.members.map(function (m) { return String(m).toLowerCase(); }) : [];
      if (!name || members.length < 2) return asJsonResponse({ ok: false, error: "Invalid group" }, 400);
      store.groups[name] = {
        members: members,
        created: now(),
        avatar: (store.groups[name] && store.groups[name].avatar) || ""
      };
      saveStore(store);
      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/group/settings") {
      var gname = String(body.name || "").trim();
      var action = String(body.action || "");
      var user = String(body.user || "").toLowerCase();
      var member = String(body.member || "").toLowerCase();
      if (!store.groups[gname]) return asJsonResponse({ ok: false, error: "Group not found" }, 404);
      var group = store.groups[gname];
      group.members = group.members || [];
      if (action === "add_member" && member && group.members.indexOf(member) === -1) group.members.push(member);
      if (action === "remove_member" && member) group.members = group.members.filter(function (m) { return m !== member; });
      if (action === "leave" && user) group.members = group.members.filter(function (m) { return m !== user; });
      if (action === "delete") delete store.groups[gname];
      if (action === "avatar") group.avatar = body.avatar || "";
      saveStore(store);
      return asJsonResponse({ ok: true, group: store.groups[gname] || {} });
    }

    if (pathname === "/api/group/send") {
      var groupName = String(body.group || "").trim();
      var senderGroup = String(body.sender || "").toLowerCase();
      var text = String(body.text || "");
      if (!groupName || !senderGroup || !text) return asJsonResponse({ ok: false }, 400);
      if (!store.groups[groupName] || (store.groups[groupName].members || []).indexOf(senderGroup) === -1) {
        return asJsonResponse({ ok: false, error: "Not in group" }, 403);
      }
      if (!store.group_messages[groupName]) store.group_messages[groupName] = [];
      store.group_messages[groupName].push({ id: uuid(), sender: senderGroup, text: text, timestamp: now() });
      saveStore(store);
      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/friend/add") {
      var from = String(body.from || "").toLowerCase();
      var to = String(body.to || "").toLowerCase();
      if (!from || !to) return asJsonResponse({ ok: false, error: "Missing user" }, 400);
      if (!store.friend_requests[to]) store.friend_requests[to] = [];
      if (store.friend_requests[to].indexOf(from) === -1) store.friend_requests[to].push(from);
      saveStore(store);
      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/friend/accept") {
      var userAccept = String(body.user || "").toLowerCase();
      var fromAccept = String(body.from || "").toLowerCase();
      ensureFriendArray(store, userAccept);
      ensureFriendArray(store, fromAccept);
      if (store.friends[userAccept].indexOf(fromAccept) === -1) store.friends[userAccept].push(fromAccept);
      if (store.friends[fromAccept].indexOf(userAccept) === -1) store.friends[fromAccept].push(userAccept);
      if (store.friend_requests[userAccept]) {
        store.friend_requests[userAccept] = store.friend_requests[userAccept].filter(function (x) { return x !== fromAccept; });
      }
      saveStore(store);
      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/friend/decline") {
      var userDecline = String(body.user || "").toLowerCase();
      var fromDecline = String(body.from || "").toLowerCase();
      if (store.friend_requests[userDecline]) {
        store.friend_requests[userDecline] = store.friend_requests[userDecline].filter(function (x) { return x !== fromDecline; });
      }
      saveStore(store);
      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/friend/remove") {
      var userRemove = String(body.user || "").toLowerCase();
      var friendRemove = String(body.friend || "").toLowerCase();
      ensureFriendArray(store, userRemove);
      ensureFriendArray(store, friendRemove);
      store.friends[userRemove] = store.friends[userRemove].filter(function (x) { return x !== friendRemove; });
      store.friends[friendRemove] = store.friends[friendRemove].filter(function (x) { return x !== userRemove; });
      saveStore(store);
      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/changenick") {
      var oldNick = String(body.oldNick || "").toLowerCase();
      var newNick = String(body.newNick || "").toLowerCase();
      if (!oldNick || !newNick) return asJsonResponse({ ok: false, error: "Missing nickname" }, 400);
      if (store.users[newNick] || store.passwords[newNick]) return asJsonResponse({ ok: false, error: "Ник уже занят" }, 400);

      if (store.users[oldNick]) {
        store.users[newNick] = store.users[oldNick];
        delete store.users[oldNick];
        store.users[newNick].displayName = newNick;
      }
      if (store.passwords[oldNick]) {
        store.passwords[newNick] = store.passwords[oldNick];
        delete store.passwords[oldNick];
      }
      if (store.friends[oldNick]) {
        store.friends[newNick] = store.friends[oldNick];
        delete store.friends[oldNick];
      }
      Object.keys(store.friends).forEach(function (u) {
        store.friends[u] = (store.friends[u] || []).map(function (f) {
          return f === oldNick ? newNick : f;
        });
      });
      if (store.friend_requests[oldNick]) {
        store.friend_requests[newNick] = store.friend_requests[oldNick];
        delete store.friend_requests[oldNick];
      }
      Object.keys(store.friend_requests).forEach(function (u) {
        store.friend_requests[u] = (store.friend_requests[u] || []).map(function (f) {
          return f === oldNick ? newNick : f;
        });
      });
      var newMessages = {};
      Object.keys(store.messages).forEach(function (k) {
        var parts = k.split("|||");
        if (parts.length === 2) {
          var a = parts[0] === oldNick ? newNick : parts[0];
          var b = parts[1] === oldNick ? newNick : parts[1];
          var nk = keyForUsers(a, b);
          newMessages[nk] = (store.messages[k] || []).map(function (m) {
            if (m.sender === oldNick) {
              var cloned = Object.assign({}, m);
              cloned.sender = newNick;
              return cloned;
            }
            return m;
          });
        } else {
          newMessages[k] = store.messages[k];
        }
      });
      store.messages = newMessages;
      Object.keys(store.groups).forEach(function (groupName) {
        var g = store.groups[groupName];
        g.members = (g.members || []).map(function (m) {
          return m === oldNick ? newNick : m;
        });
      });
      Object.keys(store.group_messages).forEach(function (groupName) {
        store.group_messages[groupName] = (store.group_messages[groupName] || []).map(function (m) {
          if (m.sender === oldNick) {
            var cloned = Object.assign({}, m);
            cloned.sender = newNick;
            return cloned;
          }
          return m;
        });
      });
      saveStore(store);
      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/call") {
      var callFrom = String(body.from || "").toLowerCase();
      var callTo = String(body.to || "").toLowerCase();
      var callType = String(body.type || "call");
      if (!callFrom || !callTo) return asJsonResponse({ ok: false }, 400);
      store.calls[callTo] = { from: callFrom, type: callType, time: now() };
      saveStore(store);
      return asJsonResponse({ ok: true });
    }

    return null;
  }

  var nativeFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    var reqUrl = typeof input === "string" ? input : (input && input.url) || "";
    var url = new URL(reqUrl, window.location.origin);
    if (url.pathname.indexOf("/api/") !== 0) {
      return nativeFetch(input, init);
    }

    var method = ((init && init.method) || (input && input.method) || "GET").toUpperCase();
    var store = loadStore();
    var response = null;

    if (method === "GET") {
      response = handleGet(url.pathname, url.searchParams, store);
    } else if (method === "POST") {
      response = handlePost(url.pathname, parseBody(init || {}), store);
    } else if (method === "OPTIONS") {
      response = asJsonResponse({ ok: true });
    }

    if (response) return response;
    return asJsonResponse({ ok: false, error: "Not found" }, 404);
  };
})();
