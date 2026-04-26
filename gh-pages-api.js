/* Supabase-backed API emulation for GitHub Pages. */
(function () {
  window.__GH_PAGES_API_READY = true;

  var SUPABASE_URL = "https://yfmmcociwvyqfrebmoev.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_ZKsRnVs5eVNhfb4RmXf_JA_Hzmc9OK5";
  var API_BASE = SUPABASE_URL + "/rest/v1";

  function now() {
    return Date.now() / 1000;
  }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "id_" + Math.random().toString(16).slice(2) + "_" + Date.now();
  }

  function keyForUsers(a, b) {
    return [String(a || "").toLowerCase(), String(b || "").toLowerCase()].sort().join("|||");
  }

  function headers(extra) {
    return Object.assign(
      {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      extra || {}
    );
  }

  async function sb(path, method, body, extraHeaders) {
    var res = await fetch(API_BASE + path, {
      method: method || "GET",
      headers: headers(extraHeaders),
      body: body ? JSON.stringify(body) : undefined
    });
    var text = await res.text();
    var json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (_err) {
      json = null;
    }
    if (!res.ok) {
      var msg = (json && (json.message || json.error_description || json.error)) || text || "Supabase error";
      throw new Error(msg);
    }
    return json;
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
    if (!options || !options.body) return {};
    if (typeof options.body === "string") {
      try {
        return JSON.parse(options.body);
      } catch (_err) {
        return {};
      }
    }
    return options.body || {};
  }

  async function getUserByName(username) {
    var rows = await sb("/users?username=eq." + encodeURIComponent(username) + "&select=*", "GET");
    return rows && rows[0] ? rows[0] : null;
  }

  async function getFriendsOf(username) {
    var rows = await sb("/friends?or=(user.eq." + encodeURIComponent(username) + ",friend.eq." + encodeURIComponent(username) + ")&select=user,friend", "GET");
    return (rows || []).map(function (r) {
      return r.user === username ? r.friend : r.user;
    });
  }

  async function handleGet(pathname, params) {
    if (pathname === "/api/users") {
      var q = String(params.get("q") || "").toLowerCase();
      var currentUser = String(params.get("user") || "").toLowerCase();
      var users = await sb("/users?select=username,display_name,online,avatar", "GET");
      var friends = await getFriendsOf(currentUser);
      var friendSet = {};
      friends.forEach(function (f) {
        friendSet[f] = true;
      });
      var out = (users || [])
        .filter(function (u) {
          var uname = String(u.username || "").toLowerCase();
          var display = String(u.display_name || uname).toLowerCase();
          if (!uname || uname === currentUser || friendSet[uname]) return false;
          if (!q) return true;
          return uname.indexOf(q) !== -1 || display.indexOf(q) !== -1;
        })
        .map(function (u) {
          return {
            username: u.username,
            displayName: u.display_name || u.username,
            online: !!u.online,
            avatar: u.avatar || ""
          };
        });
      return asJsonResponse({ users: out });
    }

    if (pathname === "/api/user") {
      var target = String(params.get("username") || "").toLowerCase();
      var user = await getUserByName(target);
      return asJsonResponse({
        username: target,
        displayName: (user && user.display_name) || target,
        online: !!(user && user.online),
        avatar: (user && user.avatar) || ""
      });
    }

    if (pathname === "/api/friends") {
      var username = String(params.get("user") || "").toLowerCase();
      var friendUsernames = await getFriendsOf(username);
      if (!friendUsernames.length) return asJsonResponse({ friends: [] });
      var inClause = friendUsernames.map(function (u) { return '"' + u + '"'; }).join(",");
      var users = await sb("/users?username=in.(" + encodeURIComponent(inClause) + ")&select=username,display_name,online,avatar", "GET");
      var list = (users || []).map(function (u) {
        return {
          username: u.username,
          displayName: u.display_name || u.username,
          online: !!u.online,
          avatar: u.avatar || ""
        };
      });
      return asJsonResponse({ friends: list });
    }

    if (pathname === "/api/friend/requests") {
      var reqUser = String(params.get("user") || "").toLowerCase();
      var reqRows = await sb("/friend_requests?user=eq." + encodeURIComponent(reqUser) + "&select=from_user", "GET");
      return asJsonResponse({ requests: (reqRows || []).map(function (r) { return r.from_user; }) });
    }

    if (pathname === "/api/messages") {
      var user1 = String(params.get("user1") || "").toLowerCase();
      var user2 = String(params.get("user2") || "").toLowerCase();
      if (!user1 || !user2) return asJsonResponse({ messages: [] });
      var chatKey = keyForUsers(user1, user2);
      var rows = await sb("/messages?chat_key=eq." + encodeURIComponent(chatKey) + "&order=timestamp.asc&select=id,sender,text,type,data,timestamp,deleted_for_sender", "GET");
      var filtered = (rows || []).filter(function (m) {
        return !(m.deleted_for_sender && m.sender === user1);
      });
      return asJsonResponse({ messages: filtered });
    }

    if (pathname === "/api/group/list") {
      var groupUser = String(params.get("user") || "").toLowerCase();
      var rows = await sb("/groups?select=name,members", "GET");
      var groups = (rows || [])
        .filter(function (g) {
          var members = Array.isArray(g.members) ? g.members : [];
          return members.indexOf(groupUser) !== -1;
        })
        .map(function (g) {
          return { name: g.name, members: Array.isArray(g.members) ? g.members : [] };
        });
      return asJsonResponse({ groups: groups });
    }

    if (pathname === "/api/group/messages") {
      var group = String(params.get("group") || "");
      var rows = await sb("/group_messages?group_name=eq." + encodeURIComponent(group) + "&order=timestamp.asc&select=id,sender,text,timestamp", "GET");
      return asJsonResponse({ messages: rows || [] });
    }

    if (pathname === "/api/group/info") {
      var name = String(params.get("name") || "");
      var rows = await sb("/groups?name=eq." + encodeURIComponent(name) + "&select=name,members,avatar", "GET");
      var g = rows && rows[0] ? rows[0] : null;
      return asJsonResponse({ name: name, members: (g && g.members) || [], avatar: (g && g.avatar) || "" });
    }

    if (pathname === "/api/call/status") {
      var user = String(params.get("user") || "").toLowerCase();
      var rows = await sb("/calls?call_to=eq." + encodeURIComponent(user) + "&select=from_user,type,time", "GET");
      var c = rows && rows[0] ? rows[0] : null;
      if (c && now() - Number(c.time || 0) < 30) return asJsonResponse({ call: { from: c.from_user, type: c.type, time: c.time } });
      return asJsonResponse({ call: null });
    }

    return null;
  }

  async function handlePost(pathname, body) {
    if (pathname === "/api/register") {
      var username = String(body.username || "").trim().toLowerCase();
      var password = String(body.password || "").trim();
      if (!username || !password) return asJsonResponse({ ok: false, error: "Missing username or password" }, 400);
      var exists = await getUserByName(username);
      if (exists) return asJsonResponse({ ok: false, error: "Username already exists" }, 400);
      await sb("/users", "POST", [{ username: username, password: password, online: true, created_at: now(), display_name: username }], { Prefer: "return=representation" });
      return asJsonResponse({ ok: true, username: username });
    }

    if (pathname === "/api/login") {
      var loginUser = String(body.username || "").trim().toLowerCase();
      var loginPass = String(body.password || "").trim();
      if (!loginUser) return asJsonResponse({ ok: false, error: "Введи никнейм" }, 400);
      if (!loginPass) return asJsonResponse({ ok: false, error: "Введи пароль" }, 400);
      var user = await getUserByName(loginUser);
      if (!user || user.password !== loginPass) return asJsonResponse({ ok: false, error: "Неверный никнейм или пароль" }, 401);
      await sb("/users?username=eq." + encodeURIComponent(loginUser), "PATCH", { online: true });
      return asJsonResponse({ ok: true, username: loginUser });
    }

    if (pathname === "/api/settings") {
      var settingsUser = String(body.username || "").toLowerCase();
      var s = body.settings || {};
      await sb("/users?username=eq." + encodeURIComponent(settingsUser), "PATCH", {
        theme: s.theme || "",
        avatar: s.avatar || "",
        sound: s.sound !== false,
        vibrate: s.vibrate !== false,
        sound_type: s.soundType || "default",
        custom_sound: s.customSound || ""
      });
      var userAfter = await getUserByName(settingsUser);
      return asJsonResponse({
        ok: true,
        settings: userAfter
          ? {
              theme: userAfter.theme || "",
              avatar: userAfter.avatar || "",
              sound: userAfter.sound !== false,
              vibrate: userAfter.vibrate !== false,
              soundType: userAfter.sound_type || "default",
              customSound: userAfter.custom_sound || ""
            }
          : {}
      });
    }

    if (pathname === "/api/send") {
      var sender = String(body.sender || "").toLowerCase();
      var recipient = String(body.recipient || "").toLowerCase();
      if (!sender || !recipient) return asJsonResponse({ ok: false, error: "Missing sender or recipient" }, 400);
      await sb("/messages", "POST", [
        {
          id: uuid(),
          chat_key: keyForUsers(sender, recipient),
          sender: sender,
          text: body.text || null,
          type: body.type || null,
          data: body.data || null,
          timestamp: now(),
          deleted_for_sender: false
        }
      ]);
      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/message/delete") {
      var user1 = String(body.user1 || "").toLowerCase();
      var user2 = String(body.user2 || "").toLowerCase();
      var idx = Number(body.idx);
      var where = body.where || "me";
      var rows = await sb("/messages?chat_key=eq." + encodeURIComponent(keyForUsers(user1, user2)) + "&order=timestamp.asc&select=id", "GET");
      if (!Number.isNaN(idx) && idx >= 0 && idx < (rows || []).length) {
        var id = rows[idx].id;
        if (where === "both") await sb("/messages?id=eq." + encodeURIComponent(id), "DELETE");
        else await sb("/messages?id=eq." + encodeURIComponent(id), "PATCH", { deleted_for_sender: true });
      }
      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/group") {
      var name = String(body.name || "").trim();
      var members = Array.isArray(body.members) ? body.members.map(function (m) { return String(m).toLowerCase(); }) : [];
      if (!name || members.length < 2) return asJsonResponse({ ok: false, error: "Invalid group" }, 400);
      await sb("/groups", "POST", [{ name: name, members: members, created_at: now(), avatar: "" }], { Prefer: "resolution=merge-duplicates" });
      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/group/settings") {
      var gname = String(body.name || "").trim();
      var action = String(body.action || "");
      var user = String(body.user || "").toLowerCase();
      var member = String(body.member || "").toLowerCase();
      var rows = await sb("/groups?name=eq." + encodeURIComponent(gname) + "&select=name,members,avatar", "GET");
      if (!rows || !rows[0]) return asJsonResponse({ ok: false, error: "Group not found" }, 404);
      var g = rows[0];
      var members = Array.isArray(g.members) ? g.members.slice() : [];

      if (action === "add_member" && member && members.indexOf(member) === -1) members.push(member);
      if (action === "remove_member" && member) members = members.filter(function (m) { return m !== member; });
      if (action === "leave" && user) members = members.filter(function (m) { return m !== user; });
      if (action === "delete") {
        await sb("/groups?name=eq." + encodeURIComponent(gname), "DELETE");
        return asJsonResponse({ ok: true, group: {} });
      }

      await sb("/groups?name=eq." + encodeURIComponent(gname), "PATCH", {
        members: members,
        avatar: action === "avatar" ? body.avatar || "" : g.avatar || ""
      });
      var updated = await sb("/groups?name=eq." + encodeURIComponent(gname) + "&select=name,members,avatar", "GET");
      return asJsonResponse({ ok: true, group: (updated && updated[0]) || {} });
    }

    if (pathname === "/api/group/send") {
      var groupName = String(body.group || "").trim();
      var senderGroup = String(body.sender || "").toLowerCase();
      var text = String(body.text || "");
      if (!groupName || !senderGroup || !text) return asJsonResponse({ ok: false }, 400);
      await sb("/group_messages", "POST", [{ id: uuid(), group_name: groupName, sender: senderGroup, text: text, timestamp: now() }]);
      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/friend/add") {
      var from = String(body.from || "").toLowerCase();
      var to = String(body.to || "").toLowerCase();
      if (!from || !to) return asJsonResponse({ ok: false, error: "Missing user" }, 400);
      await sb("/friend_requests", "POST", [{ user: to, from_user: from }], { Prefer: "resolution=ignore-duplicates" });
      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/friend/accept") {
      var userAccept = String(body.user || "").toLowerCase();
      var fromAccept = String(body.from || "").toLowerCase();
      var pairA = userAccept < fromAccept ? userAccept : fromAccept;
      var pairB = userAccept < fromAccept ? fromAccept : userAccept;
      await sb("/friends", "POST", [{ user: pairA, friend: pairB }], { Prefer: "resolution=ignore-duplicates" });
      await sb("/friend_requests?user=eq." + encodeURIComponent(userAccept) + "&from_user=eq." + encodeURIComponent(fromAccept), "DELETE");
      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/friend/decline") {
      var userDecline = String(body.user || "").toLowerCase();
      var fromDecline = String(body.from || "").toLowerCase();
      await sb("/friend_requests?user=eq." + encodeURIComponent(userDecline) + "&from_user=eq." + encodeURIComponent(fromDecline), "DELETE");
      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/friend/remove") {
      var userRemove = String(body.user || "").toLowerCase();
      var friendRemove = String(body.friend || "").toLowerCase();
      var a = userRemove < friendRemove ? userRemove : friendRemove;
      var b = userRemove < friendRemove ? friendRemove : userRemove;
      await sb("/friends?user=eq." + encodeURIComponent(a) + "&friend=eq." + encodeURIComponent(b), "DELETE");
      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/changenick") {
      var oldNick = String(body.oldNick || "").toLowerCase();
      var newNick = String(body.newNick || "").toLowerCase();
      if (!oldNick || !newNick) return asJsonResponse({ ok: false, error: "Missing nickname" }, 400);
      var existsNick = await getUserByName(newNick);
      if (existsNick) return asJsonResponse({ ok: false, error: "Ник уже занят" }, 400);
      var oldUser = await getUserByName(oldNick);
      if (!oldUser) return asJsonResponse({ ok: false, error: "User not found" }, 404);

      await sb("/users", "POST", [Object.assign({}, oldUser, { username: newNick, display_name: newNick })]);
      await sb("/users?username=eq." + encodeURIComponent(oldNick), "DELETE");

      await sb("/messages?sender=eq." + encodeURIComponent(oldNick), "PATCH", { sender: newNick });
      await sb("/group_messages?sender=eq." + encodeURIComponent(oldNick), "PATCH", { sender: newNick });
      await sb("/friend_requests?user=eq." + encodeURIComponent(oldNick), "PATCH", { user: newNick });
      await sb("/friend_requests?from_user=eq." + encodeURIComponent(oldNick), "PATCH", { from_user: newNick });
      await sb("/calls?call_to=eq." + encodeURIComponent(oldNick), "PATCH", { call_to: newNick });
      await sb("/calls?from_user=eq." + encodeURIComponent(oldNick), "PATCH", { from_user: newNick });

      var friends = await sb("/friends?or=(user.eq." + encodeURIComponent(oldNick) + ",friend.eq." + encodeURIComponent(oldNick) + ")&select=user,friend", "GET");
      for (var i = 0; i < (friends || []).length; i++) {
        var fr = friends[i];
        var ua = fr.user === oldNick ? newNick : fr.user;
        var ub = fr.friend === oldNick ? newNick : fr.friend;
        var pa = ua < ub ? ua : ub;
        var pb = ua < ub ? ub : ua;
        await sb("/friends", "POST", [{ user: pa, friend: pb }], { Prefer: "resolution=ignore-duplicates" });
        await sb("/friends?user=eq." + encodeURIComponent(fr.user) + "&friend=eq." + encodeURIComponent(fr.friend), "DELETE");
      }

      var chats = await sb("/messages?chat_key=like.*" + encodeURIComponent(oldNick) + "*&select=id,chat_key", "GET");
      for (var j = 0; j < (chats || []).length; j++) {
        var parts = String(chats[j].chat_key || "").split("|||");
        if (parts.length === 2) {
          var c1 = parts[0] === oldNick ? newNick : parts[0];
          var c2 = parts[1] === oldNick ? newNick : parts[1];
          await sb("/messages?id=eq." + encodeURIComponent(chats[j].id), "PATCH", { chat_key: keyForUsers(c1, c2) });
        }
      }

      var groups = await sb("/groups?select=name,members", "GET");
      for (var g = 0; g < (groups || []).length; g++) {
        var members = Array.isArray(groups[g].members) ? groups[g].members.slice() : [];
        var changed = false;
        for (var m = 0; m < members.length; m++) {
          if (members[m] === oldNick) {
            members[m] = newNick;
            changed = true;
          }
        }
        if (changed) {
          await sb("/groups?name=eq." + encodeURIComponent(groups[g].name), "PATCH", { members: members });
        }
      }

      return asJsonResponse({ ok: true });
    }

    if (pathname === "/api/call") {
      var callFrom = String(body.from || "").toLowerCase();
      var callTo = String(body.to || "").toLowerCase();
      var callType = String(body.type || "call");
      if (!callFrom || !callTo) return asJsonResponse({ ok: false }, 400);
      await sb("/calls", "POST", [{ call_to: callTo, from_user: callFrom, type: callType, time: now() }], { Prefer: "resolution=merge-duplicates" });
      return asJsonResponse({ ok: true });
    }

    return null;
  }

  var nativeFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    var reqUrl = typeof input === "string" ? input : (input && input.url) || "";
    var url = new URL(reqUrl, window.location.origin);
    if (url.pathname.indexOf("/api/") !== 0) return nativeFetch(input, init);
    var method = ((init && init.method) || (input && input.method) || "GET").toUpperCase();
    var body = parseBody(init || {});
    return (async function () {
      try {
        var out = method === "GET" ? await handleGet(url.pathname, url.searchParams) : method === "POST" ? await handlePost(url.pathname, body) : asJsonResponse({ ok: true });
        if (out) return out;
        return asJsonResponse({ ok: false, error: "Not found" }, 404);
      } catch (err) {
        return asJsonResponse({ ok: false, error: err && err.message ? err.message : "Supabase request failed" }, 500);
      }
    })();
  };
})();
