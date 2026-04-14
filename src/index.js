document.addEventListener('DOMContentLoaded', () => {
      let timeLeft = 25 * 60;
      let timerInterval = null;
      let isRunning = false;
      let currentMode = 0; // 0: pomodoro, 1: short, 2: long
      let totalPomosDone = 0;
      let cycleCount = 0;

      const modes = [
        { name: "Pomodoro", time: 25 * 60, color: "#e74c3c" },
        { name: "Short Break", time: 5 * 60, color: "#27ae60" },
        { name: "Long Break", time: 15 * 60, color: "#2980b9" }
      ];

      const tasks = [];

      // ==================== NOTIFICATION SYSTEM ====================
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
          startBtn.innerHTML = '<i class="fas fa-play"></i>Start';
        } else {
          timerInterval = setInterval(() => {
            timeLeft--;
            updateDisplay();
            
            if (timeLeft <= 0) {
              clearInterval(timerInterval);
              isRunning = false;
              handleTimerEnd();
            }
          }, 1000);
          isRunning = true;
          startBtn.innerHTML = '<i class="fas fa-pause"></i>Pause';
        }
      };

      function handleTimerEnd() {
        // ISSUE #9 FIX: Play notification sound
        playNotificationSound();

        if (currentMode === 0) { // Finished pomodoro
          totalPomosDone++;
          cycleCount++;
          updateStats();
          
          // Auto switch to break
          if (cycleCount % 4 === 0) {
            setMode(2); // Long break
            showNotification('🎉 Pomodoro complete! Time for a long break.', 'success');
          } else {
            setMode(1); // Short break
            showNotification('🎉 Pomodoro complete! Time for a short break.', 'success');
          }
        } else {
          // Finished break → back to pomodoro
          setMode(0);
          showNotification('Break complete! Ready for another pomodoro? ⏱️', 'info');
        }
        
        // Auto-start next session
        toggleTimer();
      }

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
          li.className = `task-item ${task.done ? 'completed' : ''}`;
          li.innerHTML = `
            <div class="task-item-content">
              <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTaskDone(${index})">
              <span>${task.name}</span>
              <small> (${task.completed}/${task.estimated})</small>
            </div>
            <div class="task-item-actions">
              <button onclick="decrementPomo(${index})" title="Decrease pomodoros">
                <i class="fas fa-minus"></i>
              </button>
              <button onclick="incrementPomo(${index})" title="Increase pomodoros">
                <i class="fas fa-plus"></i>
              </button>
              <button onclick="deleteTask(${index})" title="Delete task">
                <i class="fas fa-trash"></i>
              </button>
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
          const minutesToAdd = remainingPomos * 25 + Math.floor(remainingPomos / 4) * 15;
          now.setMinutes(now.getMinutes() + minutesToAdd);
          const finishStr = now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
          document.getElementById('finish-time').textContent = finishStr;
        } else {
          document.getElementById('finish-time').textContent = 'Done!';
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
