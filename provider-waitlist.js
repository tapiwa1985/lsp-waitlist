/**
 * Editable launch config. Swap city, dates, and counts before you run ads.
 * URL overrides (handy for tests):
 *   ?city=Austin&waitlist=16&spots=4&close=2026-05-10
 *   ?zip=90210&homeowners=12  → "zip code test" subhead
 */
(function () {
  "use strict";
  var LEADS_API_URL = "https://local-services-api-a2f96253fa0f.herokuapp.com/api/leads";

  var CONFIG = {
    brandName: "fixZa",
    city: "Your City",
    // ISO strings in local-interpreted as Date (use explicit Z if you need UTC)
    launchDate: "2026-06-12T08:00:00",
    waitlistCloseDate: "2026-05-01T23:59:59",
    waitlistCount: 14,
    founderSlots: 20,
    /** Derived if not set: founderSlots - (founderSlots - spotsLeft) — set explicitly for copy */
    spotsLeft: 6,
    /** Example zips for chip buttons; replace with your market */
    /** Empty = hide quick-add; e.g. ["90210", "90211", "90069"] */
    exampleZips: [],
  };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function queryParams() {
    var q = window.location.search.slice(1);
    var o = {};
    if (!q) return o;
    q.split("&").forEach(function (part) {
      var i = part.indexOf("=");
      var k = i >= 0 ? decodeURIComponent(part.slice(0, i)) : part;
      var v = i >= 0 ? decodeURIComponent(part.slice(i + 1)) : "true";
      o[k] = v;
    });
    return o;
  }

  function applyConfig() {
    var p = queryParams();
    if (p.city) CONFIG.city = p.city;
    if (p.brand) CONFIG.brandName = p.brand;
    if (p.waitlist) CONFIG.waitlistCount = Math.max(0, parseInt(p.waitlist, 10) || CONFIG.waitlistCount);
    if (p.spots) CONFIG.spotsLeft = Math.max(0, parseInt(p.spots, 10) || CONFIG.spotsLeft);
    if (p.slots) CONFIG.founderSlots = Math.max(1, parseInt(p.slots, 10) || CONFIG.founderSlots);
    if (p.close) {
      var d = new Date(p.close);
      if (!isNaN(d.getTime())) CONFIG.waitlistCloseDate = d.toISOString();
    }
    if (p.launch) {
      var l = new Date(p.launch);
      if (!isNaN(l.getTime())) CONFIG.launchDate = l.toISOString();
    }
    if (p.zips) {
      CONFIG.exampleZips = p.zips.split(",").map(function (z) {
        return z.trim();
      }).filter(Boolean);
    }

    document.querySelectorAll('[data-config="brandName"]').forEach(function (el) {
      el.textContent = CONFIG.brandName;
    });
    document.querySelectorAll('[data-config="cityLabel"]').forEach(function (el) {
      el.textContent = CONFIG.city;
    });
    var waitEls = document.querySelectorAll('[data-config="waitlistCount"]');
    waitEls.forEach(function (el) {
      el.textContent = String(CONFIG.waitlistCount);
    });
    document.querySelectorAll('[data-config="spotsLeft"]').forEach(function (el) {
      el.textContent = String(CONFIG.spotsLeft);
    });

    var firstN = document.querySelector(".hero__n");
    if (firstN) firstN.textContent = String(CONFIG.founderSlots);

    var heroHeadline = document.getElementById("hero-headline");
    if (heroHeadline) {
      heroHeadline.innerHTML = "";
      var t1 = document.createTextNode("Be among the first ");
      var spanN = document.createElement("span");
      spanN.className = "hero__n";
      spanN.textContent = String(CONFIG.founderSlots);
      var t2 = document.createTextNode(" plumbers in ");
      var citySpan1 = document.createElement("span");
      citySpan1.setAttribute("data-config", "cityLabel");
      citySpan1.textContent = CONFIG.city;
      var t3 = document.createTextNode(" to get unlimited customer leads — before we open to the public.");
      heroHeadline.appendChild(t1);
      heroHeadline.appendChild(spanN);
      heroHeadline.appendChild(t2);
      heroHeadline.appendChild(citySpan1);
      heroHeadline.appendChild(t3);
    }

    var launch = new Date(CONFIG.launchDate);
    var fmtLaunch = launch.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    document.querySelectorAll('[data-config="launchDate"]').forEach(function (el) {
      el.textContent = fmtLaunch;
    });

    var close = new Date(CONFIG.waitlistCloseDate);
    var fmtClose = close.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    document.querySelectorAll('[data-config="closeDate"]').forEach(function (el) {
      el.textContent = fmtClose;
    });

    // "Fake zip" / hyper-local test: ?zip=90210&homeowners=12
    var testZip = p.zip;
    var homeowners = p.homeowners;
    var sub = document.getElementById("hero-sub");
    var lead = document.getElementById("hero-lead-default");
    if (testZip && homeowners && sub && lead) {
      sub.textContent = "Plumbers in " + testZip + ": " + homeowners + " homeowners are waiting right now.";
      sub.hidden = false;
      lead.hidden = true;
    } else if (sub && lead) {
      sub.hidden = true;
      lead.hidden = false;
    }
  }

  function runCountdown() {
    var target = new Date(CONFIG.waitlistCloseDate);
    var el = document.getElementById("countdown");
    if (!el || isNaN(target.getTime())) return;

    var daysEl = el.querySelector('[data-cd="days"]');
    var hoursEl = el.querySelector('[data-cd="hours"]');
    var minsEl = el.querySelector('[data-cd="mins"]');
    var secsEl = el.querySelector('[data-cd="secs"]');
    if (!daysEl || !hoursEl || !minsEl || !secsEl) return;

    function tick() {
      var now = new Date();
      var ms = target - now;
      if (ms <= 0) {
        daysEl.textContent = "0";
        hoursEl.textContent = "0";
        minsEl.textContent = "0";
        secsEl.textContent = "0";
        return;
      }
      var s = Math.floor(ms / 1000);
      var d = Math.floor(s / 86400);
      var h = Math.floor((s % 86400) / 3600);
      var m = Math.floor((s % 3600) / 60);
      var sc = s % 60;
      daysEl.textContent = String(d);
      hoursEl.textContent = String(h);
      minsEl.textContent = String(m);
      secsEl.textContent = String(sc);
    }
    tick();
    if (!reduceMotion) {
      setInterval(tick, 1000);
    }
  }

  function year() {
    var y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  function mobileMenu() {
    var btn = document.querySelector(".menu-toggle");
    var panel = document.getElementById("nav-drawer");
    if (!btn || !panel) return;

    function setOpen(open) {
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    setOpen(false);
    btn.addEventListener("click", function () {
      setOpen(panel.hidden);
    });
    panel.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        setOpen(false);
      });
    });
    window.addEventListener("resize", function () {
      if (window.matchMedia("(min-width: 800px)").matches) setOpen(false);
    });
  }

  function reveals() {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach(function (n) {
        n.classList.add("is-visible");
      });
      return;
    }
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            obs.unobserve(e.target);
          }
        });
      },
      { root: null, rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );
    document.querySelectorAll(".reveal").forEach(function (n) {
      obs.observe(n);
    });
  }

  function stickyCta() {
    var cta = document.getElementById("sticky-cta");
    if (!cta) return;
    var form = document.getElementById("form");
    if (!form) return;
    if (!("IntersectionObserver" in window)) {
      cta.classList.add("is-visible");
      return;
    }
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          cta.classList.toggle("is-visible", !e.isIntersecting);
        });
      },
      { root: null, threshold: 0.12 }
    );
    obs.observe(form);
  }

  function zipChips() {
    var host = document.getElementById("zip-chips");
    var field = document.querySelector('textarea[name="zips"]');
    var label = document.querySelector(".zip-quick-label");
    if (!host || !field) return;
    if (!CONFIG.exampleZips || !CONFIG.exampleZips.length) {
      host.style.display = "none";
      if (label) label.style.display = "none";
      return;
    }
    if (label) label.style.display = "block";
    host.innerHTML = "";
    CONFIG.exampleZips.forEach(function (z) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = z;
      b.addEventListener("click", function () {
        var v = field.value.trim();
        if (v.indexOf(z) === -1) {
          field.value = v ? v + ", " + z : z;
        }
        field.focus();
      });
      host.appendChild(b);
    });
  }

  function phoneOk(value) {
    var digits = String(value).replace(/\D/g, "");
    return digits.length >= 10;
  }

  function form() {
    var f = document.getElementById("waitlist-form");
    if (!f) return;
    var err = document.getElementById("form-error");
    var submit = document.getElementById("form-submit");
    var modal = document.getElementById("success-modal");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (err) err.hidden = true;
      var name = f.elements.namedItem("name");
      var email = f.elements.namedItem("email");
      var phone = f.elements.namedItem("phone");
      if (!name || !name.value.trim()) {
        e.preventDefault();
        if (err) {
          err.textContent = "Please enter your name.";
          err.hidden = false;
        }
        return;
      }
      if (!email || !String(email.value || "").trim()) {
        e.preventDefault();
        if (err) {
          err.textContent = "Please enter your email address.";
          err.hidden = false;
        }
        return;
      }
      if (!phone || !phoneOk(phone.value)) {
        e.preventDefault();
        if (err) {
          err.textContent = "Please enter a valid phone number (at least 10 digits).";
          err.hidden = false;
        }
        return;
      }

      var action = f.getAttribute("action");
      var endpoint = (action && action.trim()) || LEADS_API_URL;
      if (submit) {
        submit.disabled = true;
        submit.classList.add("is-loading");
      }
      var payload = {
        Name: String(name.value || "").trim(),
        Email: String(email.value || "").trim(),
        Phone: String(phone.value || "").trim(),
      };
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          if (!res.ok) {
            return res.json().catch(function () {
              return {};
            }).then(function (data) {
              var msg = data && data.error ? data.error : "Submission failed. Please try again.";
              throw new Error(msg);
            });
          }
          return res.json().catch(function () {
            return {};
          });
        })
        .then(function () {
          if (modal) {
            modal.hidden = false;
            var closeBtn = modal.querySelector("[data-close]");
            if (closeBtn) closeBtn.focus();
          }
          f.reset();
        })
        .catch(function (error) {
          if (err) {
            err.textContent = error && error.message ? error.message : "Could not submit right now.";
            err.hidden = false;
          }
        })
        .finally(function () {
          if (submit) {
            submit.disabled = false;
            submit.classList.remove("is-loading");
          }
        });
    });

    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target.getAttribute("data-close") != null) modal.hidden = true;
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") modal.hidden = true;
      });
    }
  }

  applyConfig();
  year();
  runCountdown();
  mobileMenu();
  reveals();
  stickyCta();
  zipChips();
  form();
})();
