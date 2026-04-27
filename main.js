(function () {
  var LEADS_API_URL = "https://local-services-api-a2f96253fa0f.herokuapp.com/api/leads";
  var DEBUG = true;

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var btn = document.querySelector(".menu-btn");
  var panel = document.getElementById("mobile-nav");
  if (btn && panel) {
    function setOpen(open) {
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }

    btn.addEventListener("click", function () {
      setOpen(panel.hidden);
    });

    panel.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setOpen(false);
      });
    });

    window.addEventListener("resize", function () {
      if (window.matchMedia("(min-width: 768px)").matches) setOpen(false);
    });
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion && "IntersectionObserver" in window) {
    var reveals = document.querySelectorAll(".reveal");
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    reveals.forEach(function (el) {
      obs.observe(el);
    });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  var leadForm = document.getElementById("provider-waiting-list-form");
  var leadStatus = document.getElementById("provider-waiting-list-status");
  if (leadForm && leadStatus) {
    if (DEBUG) console.info("[fixZa] Waiting list form initialized");
    var submitBtn = leadForm.querySelector('button[type="submit"]');
    var phonePattern = /^\+?[0-9()\-\s]{8,20}$/;

    function setStatus(message, type) {
      leadStatus.textContent = message;
      leadStatus.classList.remove("is-success", "is-error");
      if (type) leadStatus.classList.add(type);
    }

    function setSubmitting(submitting) {
      if (!submitBtn) return;
      submitBtn.disabled = submitting;
      submitBtn.setAttribute("aria-busy", submitting ? "true" : "false");
    }

    leadForm.addEventListener("submit", function (event) {
      if (DEBUG) console.info("[fixZa] Waiting list submit fired");
      event.preventDefault();

      var formData = new FormData(leadForm);
      var payload = {
        Name: String(formData.get("name") || "").trim(),
        Email: String(formData.get("email") || "").trim(),
        Phone: String(formData.get("phone") || "").trim()
      };

      if (!payload.Name || !payload.Email || !payload.Phone) {
        if (DEBUG) console.warn("[fixZa] Missing required fields", payload);
        setStatus("Please fill in name, email, and phone number.", "is-error");
        return;
      }
      if (!phonePattern.test(payload.Phone)) {
        if (DEBUG) console.warn("[fixZa] Invalid phone format", payload.Phone);
        setStatus("Please enter a valid phone number (at least 8 digits).", "is-error");
        return;
      }

      setSubmitting(true);
      setStatus("Submitting your details...", null);
      if (DEBUG) console.info("[fixZa] Posting lead payload", payload);

      fetch(LEADS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          return response.text().then(function (text) {
            var result = { ok: response.ok, status: response.status, message: text };
            try {
              var parsed = text ? JSON.parse(text) : null;
              if (parsed && typeof parsed === "object") {
                result.message =
                  parsed.message ||
                  parsed.title ||
                  parsed.error ||
                  (Array.isArray(parsed.errors) ? parsed.errors.join(", ") : text);
              }
            } catch (_) {
              // Keep plain text message.
            }
            return result;
          });
        })
        .then(function (result) {
          if (DEBUG) console.info("[fixZa] API response", result.status, result.message);
          if (!result.ok) {
            throw new Error(result.message || "Request failed with status " + result.status);
          }
          leadForm.reset();
          setStatus("You are on the provider waiting list. We will be in touch soon.", "is-success");
        })
        .catch(function (error) {
          if (DEBUG) console.error("[fixZa] Submit failed", error);
          var message = (error && error.message) || "";
          if (/failed to fetch/i.test(message)) {
            setStatus("Network/CORS error: run this page on a web server (http://localhost), not file://.", "is-error");
            return;
          }
          setStatus(message || "We could not submit your lead right now. Please try again.", "is-error");
        })
        .finally(function () {
          if (DEBUG) console.info("[fixZa] Submit finished");
          setSubmitting(false);
        });
    });
  } else if (DEBUG) {
    console.error("[fixZa] Lead form elements not found", {
      hasForm: !!leadForm,
      hasStatus: !!leadStatus
    });
  }
})();
