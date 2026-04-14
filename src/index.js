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
        
        document.getElementById('start-btn').textContent = 'Start';
        updateDisplay();
      };

      window.toggleTimer = function() {
        const startBtn = document.getElementById('start-btn');
        
        if (isRunning) {
          clearInterval(timerInterval);
          isRunning = false;
          startBtn.textContent = 'Start';
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
          startBtn.textContent = 'Pause';
        }
      };

      function handleTimerEnd() {
        if (currentMode === 0) { // Finished pomodoro
          totalPomosDone++;
          cycleCount++;
          updateStats();
          
          // Auto switch to break
          if (cycleCount % 4 === 0) {
            setMode(2); // Long break
          } else {
            setMode(1); // Short break
          }
        } else {
          // Finished break → back to pomodoro
          setMode(0);
        }
        
        // Simple notification + auto-start next session
        const message = `${modes[currentMode].name} complete!`;
        alert(message);
        toggleTimer(); // Auto-start next
      }

      window.resetTimer = function() {
        if (timerInterval) clearInterval(timerInterval);
        isRunning = false;
        timeLeft = modes[currentMode].time;
        document.getElementById('start-btn').textContent = 'Start';
        updateDisplay();
      };

      window.addTask = function() {
        const name = document.getElementById('task-name').value.trim();
        const estimated = parseInt(document.getElementById('task-pomos').value) || 1;
        
        if (!name) return;
        
        tasks.push({
          name,
          estimated,
          completed: 0,
          done: false
        });
        
        document.getElementById('task-name').value = '';
        renderTasks();
        updateStats();
      };

      function renderTasks() {
        const list = document.getElementById('task-list');
        list.innerHTML = '';
        
        tasks.forEach((task, index) => {
          const li = document.createElement('li');
          li.className = `task-item ${task.done ? 'completed' : ''}`;
          li.innerHTML = `
            <div>
              <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTaskDone(${index})">
              <span>${task.name}</span>
              <small> (${task.completed}/${task.estimated})</small>
            </div>
            <div>
              <button onclick="incrementPomo(${index})">+</button>
              <button onclick="deleteTask(${index})">×</button>
            </div>
          `;
          list.appendChild(li);
        });
      }

      window.toggleTaskDone = function(index) {
        tasks[index].done = !tasks[index].done;
        renderTasks();
        updateStats();
      };

      window.incrementPomo = function(index) {
        if (tasks[index].completed < tasks[index].estimated) {
          tasks[index].completed++;
          renderTasks();
          updateStats();
        }
      };

      window.deleteTask = function(index) {
        tasks.splice(index, 1);
        renderTasks();
        updateStats();
      };

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

      // Keyboard shortcuts (Space = start/pause, 1/2/3 = modes, R = reset)
      document.addEventListener('keydown', (e) => {
        if (e.key === ' ') {
          e.preventDefault();
          toggleTimer();
        }
        if (e.key === '1') setMode(0);
        if (e.key === '2') setMode(1);
        if (e.key === '3') setMode(2);
        if (e.key.toLowerCase() === 'r') resetTimer();
      });

      // Initialize
      updateDisplay();
      renderTasks();
      updateStats();
    });
