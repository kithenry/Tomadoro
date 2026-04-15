document.addEventListener('DOMContentLoaded', () => {
      let timeLeft = 25 * 60;
      let timerInterval = null;
      let isRunning = false;
      let currentMode = 0; // 0: pomodoro, 1: short, 2: long
      let currentTaskIndex = null; 
      let totalPomosDone = 0;
      let cycleCount = 0;
let activeTask = null;
let startTime = null;
      const modes = [
        { name: "Pomodoro", time: 25 * 60, color: "#e74c3c" },
        { name: "Short Break", time: 2 * 60, color: "#27ae60" },
        { name: "Long Break", time: 15 * 60, color: "#2980b9" }
      ];

      const tasks = [];

      // ==================== NOTIFICATION SYSTEM ====================
	function startTimer(taskId) {
  activeTask = taskId;
  startTime = Date.now();
}
	function switchTask(newTaskId) {
  if (activeTask !== null) {
    saveTime(activeTask);
  }

  activeTask = newTaskId;
  startTime = Date.now();
}
	function saveTime(taskId) {
  const duration = Date.now() - startTime;

  console.log(`Task ${taskId} time:`, duration);

  // store in DB / state
}
	function stopTimer() {
  if (activeTask !== null) {
    saveTime(activeTask);
    activeTask = null;
  }
}
      function showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.classList.add('hide');
          setTimeout(() => notification.remove(), 300);
        }, duration);
      }

      // ==================== AUDIO NOTIFICATION ====================
      function playNotificationSound() {
        // Create simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      }

      // ==================== DISPLAY & UI ====================
      function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        document.getElementById('timer').textContent = 
          `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        const total = modes[currentMode].time;
        const progress = (timeLeft / total) * 282.74;
        const circle = document.getElementById('progress');
        circle.setAttribute('stroke-dashoffset', 282.74 - progress);
        circle.setAttribute('stroke', modes[currentMode].color);
      }

      window.setMode = function(mode) {
        if (timerInterval) clearInterval(timerInterval);
        isRunning = false;
        currentMode = mode;
        timeLeft = modes[mode].time;
        
        document.querySelectorAll('.mode-buttons button').forEach((btn, i) => {
          btn.classList.toggle('active', i === mode);
        });
        
        const startBtn = document.getElementById('start-btn');
        startBtn.innerHTML = '<i class="fas fa-play"></i>Start';
        startBtn.textContent = 'Start';
        updateDisplay();
      };

      window.toggleTimer = function() {
        // ISSUE #3 FIX: Don't trigger if focus is on input field
        if (document.activeElement.tagName === 'INPUT') {
          return;
        }

        const startBtn = document.getElementById('start-btn');
        
        if (isRunning) {
          clearInterval(timerInterval);
          isRunning = false;
          startBtn.innerHTML = '<i class="fas fa-play"></i>Resume';
        } else {
          timerInterval = setInterval(() => {
            timeLeft--;
            updateDisplay();
            
            if (timeLeft <= 0) {
              clearInterval(timerInterval);
              isRunning = false;
              handleTimerEnd();
            }
	    // select undone task if any
	    // post notification
	
	    
          }, 1000);
          isRunning = true;
          startBtn.innerHTML = '<i class="fas fa-pause"></i>Pause';
        }
      };

      function handleTimerEnd() {
	      playNotificationSound();

	      if (currentMode === 0) { // Finished a Pomodoro
		      totalPomosDone++;
		      cycleCount++;

    // === NEW: Auto-log to active task ===
    if (currentTaskIndex !== null && !tasks[currentTaskIndex].done) { // there was a selected undone task
      const task = tasks[currentTaskIndex];
      if (task.completed < task.estimated) {
        task.completed++;
        showNotification(`+1 pomodoro logged to "${task.name}"`, 'success', 2500); // if task got no more pomos, mark it as completed
        if (task.completed == task.estimated){ // after the addition
		// wait for previous notification then pop this one
		task.done =  true;
		showNotification(`${task.name} completed!`, 'success', 2500);
		// currentTaskIndex = nextTask if any else current. next timer will check if any tasks are not done and act on that
      }
      } else { //this should never happen: the current task should always be a task with completed < estimatad
	task.done = true;
        showNotification(`"${task.name}" completed!`, 'info', 2000); // this should mark the task as done.
	      // add means to make it illegal to select a task that is already done
	      // notification showing task is completed
	      // notification moving to break (break will move to (all tasks completed) if no next task, else, next task)
      }
    } else if (currentTaskIndex === null) {
      showNotification('Pomodoro completed! Select a task to auto-log next time.', 'info', 3000);
    }

    updateStats();
    renderTasks();   // refresh task list to show updated count

    // Auto switch to break
    if (cycleCount % 4 === 0) {
      setMode(2);
      showNotification('4 Pomodoros complete! Long break time.', 'success');
    } else {
      setMode(1);
      showNotification('Pomodoro complete! Short break.', 'success');
    }
  } else {
    // Break finished
	  // mode needed
    // find out if there are any active tasks left: if so, switch to next task, activate and start running
    // else, switch to home page and do nothing
    setMode(0);
    showNotification('Break over — back to work!', 'info');
  }

  // Auto-start next session (as before)
  toggleTimer();
}


      window.selectTask = function(index) {
     currentTaskIndex = index;
     renderTasks();                    // re-render to show active highlight
     showNotification(`Now working on: ${tasks[index].name}`, 'info', 2000);
      };
      window.resetTimer = function() {
        if (timerInterval) clearInterval(timerInterval);
        isRunning = false;
        // ISSUE #2 FIX: Reset should switch to pomodoro mode
        if (currentMode !== 0) {
          setMode(0);
        } else {
          timeLeft = modes[currentMode].time;
          const startBtn = document.getElementById('start-btn');
          startBtn.innerHTML = '<i class="fas fa-play"></i>Start';
          updateDisplay();
        }
      };

      // ==================== TASK MANAGEMENT ====================
      window.addTask = function() {
        const nameInput = document.getElementById('task-name');
        const name = nameInput.value.trim();
        const estimated = parseInt(document.getElementById('task-pomos').value) || 1;
        
        if (!name) {
          showNotification('Please enter a task name', 'info');
          return;
        }
        
        tasks.push({
          name,
          estimated,
          completed: 0,
          done: false
        });
        
        nameInput.value = '';
        renderTasks();
        updateStats();
        showNotification(`✓ Task "${name}" added!`, 'success');
      };

     

function renderTasks() {
  const list = document.getElementById('task-list');
  list.innerHTML = '';

  tasks.forEach((task, index) => {
    const li = document.createElement('li');
    li.className = `task-item ${task.done ? 'completed' : ''} 
                    ${index === currentTaskIndex ? 'active-task' : ''}`;

    li.innerHTML = `
      <div class="task-info" onclick="selectTask(${index})">
        <span class="task-name">${task.name}</span>
        <span class="task-progress">${task.completed}/${task.estimated}</span>
      </div>
      <div class="task-actions">
        ${index === currentTaskIndex ? '<span class="active-indicator">●</span>' : ''}
        <button onclick="incrementPomo(${index}); event.stopImmediatePropagation()" title="+1 pomodoro">＋</button>
        <button onclick="decrementPomo(${index}); event.stopImmediatePropagation()" title="-1 pomodoro">－</button>
        <button onclick="toggleTaskDone(${index}); event.stopImmediatePropagation()" title="Mark done">✓</button>
        <button onclick="deleteTask(${index}); event.stopImmediatePropagation()" title="Delete">✕</button>
      </div>
    `;
    list.appendChild(li);
  });
}


      window.toggleTaskDone = function(index) {
        tasks[index].done = !tasks[index].done;
        renderTasks();
        updateStats();
        const task = tasks[index];
        const status = task.done ? 'completed' : 'reopened';
        showNotification(`Task ${status}`, 'info', 2000);
      };

      window.incrementPomo = function(index) {
        if (tasks[index].completed < tasks[index].estimated) {
          tasks[index].completed++;
          renderTasks();
          updateStats();
          showNotification('+1 pomodoro logged', 'success', 2000);
        }
      };

      // ISSUE #5 FIX: Add ability to decrease pomodoros
      window.decrementPomo = function(index) {
        if (tasks[index].completed > 0) {
          tasks[index].completed--;
          renderTasks();
          updateStats();
          showNotification('-1 pomodoro', 'info', 2000);
        }
      };

      window.deleteTask = function(index) {
        const taskName = tasks[index].name;
        tasks.splice(index, 1);
        renderTasks();
        updateStats();
        showNotification(`Task removed`, 'info', 2000);
      };

      // ISSUE #4 FIX: Clear all tasks with confirmation
      window.showClearConfirmation = function() {
        if (tasks.length === 0) {
          showNotification('No tasks to clear', 'info');
          return;
        }
        document.getElementById('confirmModal').classList.add('show');
      };

      window.cancelClear = function() {
        document.getElementById('confirmModal').classList.remove('show');
      };

      window.clearAllTasks = function() {
        tasks.length = 0;
        renderTasks();
        updateStats();
        document.getElementById('confirmModal').classList.remove('show');
        showNotification('All tasks cleared', 'info');
      };

      // ==================== STATISTICS ====================
      function updateStats() {
        document.getElementById('completed-count').textContent = totalPomosDone;
        
        const remainingPomos = tasks.reduce((sum, t) => sum + (t.estimated - t.completed), 0);
        if (remainingPomos > 0) {
            const now = new Date();
	    let pomos = remainingPomos;
	    let toMulBy5 = pomos-Math.floor(pomos/4);
	    if(Math.floor(pomos%4) > 0){
		toMulBy5 = toMulBy5-1;
	    }
	    let toMulBy15 = pomos - toMulBy5  - 1;
	    //console.log(now);
	    //console.log(pomos);
            const minutesToAdd = remainingPomos * 25 + toMulBy15 * 15 + toMulBy5 * 5; // counting the breaks with /4
            now.setMinutes(now.getMinutes() + minutesToAdd);
            const finishStr = now.toLocaleTimeString('en-US', {timeZone:"Asia/Famagusta",hour: '2-digit', minute: '2-digit'});
          document.getElementById('finish-time').textContent = finishStr;
        } else {
          document.getElementById('finish-time').textContent = 'NA | No active tasks.';
        }
      }

      // ==================== KEYBOARD SHORTCUTS ====================
      document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in input
        if (document.activeElement.tagName === 'INPUT') {
          // ISSUE #1 FIX: Allow Enter to add task
          if (e.key === 'Enter' && document.activeElement.id === 'task-name') {
            addTask();
            e.preventDefault();
          }
          return;
        }

        // ISSUE #3 FIX: Space bar handling (only when not in input)
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          toggleTimer();
        }
        if (e.key === '1') setMode(0);
        if (e.key === '2') setMode(1);
        if (e.key === '3') setMode(2);
        if (e.key.toLowerCase() === 'r') resetTimer();
      });

      // Close modal when clicking outside
      document.getElementById('confirmModal').addEventListener('click', function(e) {
        if (e.target === this) {
          cancelClear();
        }
      });

      // Initialize
      updateDisplay();
      renderTasks();
      updateStats();
    });
