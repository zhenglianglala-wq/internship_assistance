-- Only the local BOSS connector calls this script; never accepts an arbitrary browser target.
on isBossURL(pageURL)
  return pageURL starts with "https://www.zhipin.com/" or pageURL starts with "https://zhipin.com/"
end isBossURL

on run argv
  set actionName to item 1 of argv
  set payload to item 2 of argv
  set targetWindowID to item 3 of argv
  set targetTabIndex to item 4 of argv
  if application "Safari" is not running then error "SAFARI_NOT_RUNNING"
  tell application "Safari"
    if (count of windows) is 0 then error "BOSS_TAB_NOT_FOUND"
    if actionName is "open" then
      if not my isBossURL(payload) then error "BOSS_URL_REQUIRED"
      set searchWindow to front window
      repeat with win in windows
        repeat with candidateTab in tabs of win
          if my isBossURL(URL of candidateTab) then
            set searchWindow to win
            exit repeat
          end if
        end repeat
        if searchWindow is not front window then exit repeat
      end repeat
      set newTab to make new tab at end of tabs of searchWindow with properties {URL:payload}
      set current tab of searchWindow to newTab
      return (id of searchWindow as text) & linefeed & ((count of tabs of searchWindow) as text) & linefeed & "{\"opened\":true}"
    end if
    if actionName is not "read" and actionName is not "select" then error "UNKNOWN_ACTION"
    set bossWindow to missing value
    set bossTab to missing value
    set tabNumber to 0
    if targetWindowID is not "" then
      repeat with win in windows
        if (id of win as text) is targetWindowID then
          if (count of tabs of win) < (targetTabIndex as integer) then error "BOSS_TAB_CHANGED"
          set bossWindow to win
          set tabNumber to targetTabIndex as integer
          set bossTab to tab tabNumber of win
        end if
      end repeat
      if bossTab is missing value then error "BOSS_TAB_CHANGED"
    else
      -- Prefer the current BOSS tab. Otherwise require an unambiguous BOSS tab.
      set currentURL to URL of current tab of front window
      if my isBossURL(currentURL) then
        set bossWindow to front window
        set bossTab to current tab of front window
        repeat with i from 1 to count of tabs of front window
          if tab i of front window is bossTab then set tabNumber to i
        end repeat
      else
        set matches to 0
        repeat with win in windows
          repeat with i from 1 to count of tabs of win
            set pageURL to URL of tab i of win
            if my isBossURL(pageURL) then
              set matches to matches + 1
              set bossWindow to win
              set bossTab to tab i of win
              set tabNumber to i
            end if
          end repeat
        end repeat
        if matches is 0 then error "BOSS_TAB_NOT_FOUND"
        if matches > 1 then error "BOSS_TAB_AMBIGUOUS"
      end if
    end if
    if not my isBossURL(URL of bossTab) then error "BOSS_TAB_CHANGED"
    set resultJSON to do JavaScript payload in bossTab
    -- The script returns only the BOSS page fields; never cookies or other tabs' contents.
    return (id of bossWindow as text) & linefeed & (tabNumber as text) & linefeed & resultJSON
  end tell
end run
