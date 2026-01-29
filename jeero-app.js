// Configuration
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxlpgjtyD2MVp5wWGdbs2g6nj9cLsAfcBs2jtThkBMtN0mmQJn1lFRjHxfugBp5jOiyLg/exec'; // Replace with your deployed web app URL
const ADMIN_PASSWORD = 'admin123'; // Change this to your secure password

// State Management
let calcExpression = '';
let calcResult = '0';
let timerInterval = null;
let timerSeconds = 1500;
let timerRunning = false;
let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
let selectedNotes = new Set();
let userData = JSON.parse(localStorage.getItem('userData')) || null;
let formulas = JSON.parse(localStorage.getItem('formulas')) || getDefaultFormulas();
let notes = JSON.parse(localStorage.getItem('notes')) || getDefaultNotes();
let formulaImageData = null;
let noteImageData = null;

// Initialize app
window.onload = function() {
    updateCalcDisplay();
    updateTimerDisplay();
    checkUserRegistration();
    loadPeriodicTable();
    loadConstants();
    updateGreeting();
};

// User Registration
function checkUserRegistration() {
    if (!userData) {
        document.getElementById('registrationModal').classList.add('active');
    } else {
        updateGreeting();
        sendUserToGoogleSheets(userData);
    }
}

function handleRegistration(event) {
    event.preventDefault();
    
    userData = {
        name: document.getElementById('userName').value,
        age: document.getElementById('userAge').value,
        exam: document.getElementById('userExam').value,
        class: document.getElementById('userClass').value || 'Not specified',
        registrationDate: new Date().toISOString(),
        lastActive: new Date().toISOString()
    };
    
    localStorage.setItem('userData', JSON.stringify(userData));
    document.getElementById('registrationModal').classList.remove('active');
    updateGreeting();
    sendUserToGoogleSheets(userData);
    
    // Show welcome message
    const greetings = [
        `Welcome aboard, ${userData.name}! 🎉`,
        `Great to have you, ${userData.name}! Let's ace this! 💪`,
        `Hello ${userData.name}! Ready to conquer ${userData.exam}? 🚀`
    ];
    alert(greetings[Math.floor(Math.random() * greetings.length)]);
}

function updateGreeting() {
    if (!userData) return;
    
    const hour = new Date().getHours();
    let timeGreeting = 'Hello';
    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 17) timeGreeting = 'Good afternoon';
    else timeGreeting = 'Good evening';
    
    const greetings = [
        `${timeGreeting}, ${userData.name}! 👋`,
        `Hey ${userData.name}! Ready to study? 📚`,
        `${timeGreeting}, ${userData.name}! Let's learn! 🎯`,
        `Hi ${userData.name}! What shall we study today? 📖`
    ];
    
    document.getElementById('userGreeting').textContent = greetings[Math.floor(Math.random() * greetings.length)];
    
    // Update last active
    userData.lastActive = new Date().toISOString();
    localStorage.setItem('userData', JSON.stringify(userData));
}

// Send user data to Google Sheets
async function sendUserToGoogleSheets(user) {
    if (!GOOGLE_SHEETS_URL || GOOGLE_SHEETS_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
        console.log('Google Sheets URL not configured');
        return;
    }
    
    try {
        const response = await fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'addUser',
                data: user
            })
        });
        console.log('User data sent to Google Sheets');
    } catch (error) {
        console.error('Error sending to Google Sheets:', error);
    }
}

// Theme
function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

if (localStorage.getItem('theme') === 'dark' || !localStorage.getItem('theme')) {
    document.body.classList.add('dark');
}

// Tab Navigation
function showTab(tabName, eventObj) {
    const tabs = document.querySelectorAll('.content-section');
    const buttons = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    buttons.forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    
    // Only try to highlight button if event was provided
    if (eventObj && eventObj.target) {
        eventObj.target.classList.add('active');
    } else {
        // If called from console, find and activate the corresponding button
        buttons.forEach(btn => {
            if (btn.textContent.toLowerCase().includes(tabName)) {
                btn.classList.add('active');
            }
        });
    }
    
    // Show/hide buttons
    const pdfBtn = document.getElementById('pdfButton');
    pdfBtn.style.display = tabName === 'notes' ? 'block' : 'none';
    
    // Check admin access
    if (tabName === 'admin') {
        const password = prompt('Enter admin password:');
        if (password !== ADMIN_PASSWORD) {
            alert('Incorrect password!');
            showTab('calculator');
            return;
        }
        document.getElementById('adminBtn').classList.remove('hidden');
        loadAdminStats();
    }
    
    // Initialize content
    if (tabName === 'formulas' && !document.getElementById('formulaList').innerHTML) {
        loadFormulas();
    } else if (tabName === 'notes' && !document.getElementById('notesList').innerHTML) {
        loadNotes();
    } else if (tabName === 'constants' && !document.getElementById('constantsList').innerHTML) {
        loadConstants();
    } else if (tabName === 'bookmarks') {
        loadBookmarks();
    }
}

// ============= CALCULATOR =============
function appendNumber(num) {
    if (calcResult === '0' && num !== '.') {
        calcResult = num;
    } else {
        calcResult += num;
    }
    updateCalcDisplay();
}

function appendOperator(op) {
    if (calcExpression && !calcExpression.endsWith(' ')) {
        calcExpression += ' ' + calcResult + ' ' + op;
        calcResult = '0';
    } else if (calcResult !== '0') {
        calcExpression = calcResult + ' ' + op;
        calcResult = '0';
    }
    updateCalcDisplay();
}

function calcFunction(func) {
    const num = parseFloat(calcResult);
    let result;
    
    switch(func) {
        case 'sin': result = Math.sin(num * Math.PI / 180); break;
        case 'cos': result = Math.cos(num * Math.PI / 180); break;
        case 'tan': result = Math.tan(num * Math.PI / 180); break;
        case 'log': result = Math.log10(num); break;
        case 'sqrt': result = Math.sqrt(num); break;
        case 'square': result = num * num; break;
        case 'cube': result = num * num * num; break;
        case 'exp': result = Math.exp(num); break;
    }
    
    calcResult = result.toString();
    calcExpression = func + '(' + num + ')';
    updateCalcDisplay();
}

function calculate() {
    try {
        const fullExpression = calcExpression + ' ' + calcResult;
        const result = eval(fullExpression.replace('×', '*').replace('÷', '/').replace('−', '-').replace('^', '**'));
        calcExpression = fullExpression + ' =';
        calcResult = result.toString();
        updateCalcDisplay();
    } catch (e) {
        calcResult = 'Error';
        updateCalcDisplay();
    }
}

function clearCalc() {
    calcExpression = '';
    calcResult = '0';
    updateCalcDisplay();
}

function deleteChar() {
    calcResult = calcResult.slice(0, -1) || '0';
    updateCalcDisplay();
}

function updateCalcDisplay() {
    document.getElementById('expression').textContent = calcExpression;
    document.getElementById('result').textContent = calcResult;
}

// ============= FORMULAS =============
function getDefaultFormulas() {
    return [
        { subject: 'physics', category: 'Mechanics', title: 'Newton\'s Second Law', formula: 'F = ma', description: 'Force equals mass times acceleration' },
        { subject: 'physics', category: 'Mechanics', title: 'Kinetic Energy', formula: 'KE = ½mv²', description: 'Energy of motion' },
        { subject: 'physics', category: 'Electricity', title: 'Ohm\'s Law', formula: 'V = IR', description: 'Voltage = Current × Resistance' },
        { subject: 'chemistry', category: 'Physical', title: 'Ideal Gas Law', formula: 'PV = nRT', description: 'Gas equation' },
        { subject: 'maths', category: 'Algebra', title: 'Quadratic Formula', formula: 'x = (-b ± √(b² - 4ac))/2a', description: 'Roots of quadratic' },
    ];
}

function loadFormulas() {
    displayFormulas(formulas);
}

function displayFormulas(formulaArray) {
    const container = document.getElementById('formulaList');
    container.innerHTML = '';
    
    formulaArray.forEach((formula, index) => {
        const card = document.createElement('div');
        card.className = 'formula-card';
        
        let formulaContent = '';
        if (formula.imageData) {
            formulaContent = `<img src="${formula.imageData}" class="formula-image" alt="${formula.title}">`;
        } else {
            formulaContent = `<div class="formula-content">${formula.formula}</div>`;
        }
        
        card.innerHTML = `
            <div class="formula-header">
                <div class="formula-title">${formula.title}</div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span class="formula-badge">${formula.category}</span>
                    <button class="bookmark-btn ${isBookmarked('formula', index) ? 'bookmarked' : ''}" 
                            onclick="toggleBookmark('formula', ${index}, event)">★</button>
                </div>
            </div>
            ${formulaContent}
            <div class="formula-description">${formula.description}</div>
        `;
        container.appendChild(card);
    });
}

function filterFormulas(subject) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (subject === 'all') {
        displayFormulas(formulas);
    } else {
        const filtered = formulas.filter(f => f.subject === subject);
        displayFormulas(filtered);
    }
}

function searchFormulas() {
    const query = document.getElementById('formulaSearch').value.toLowerCase();
    const filtered = formulas.filter(f => 
        f.title.toLowerCase().includes(query) ||
        f.formula.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query) ||
        f.category.toLowerCase().includes(query)
    );
    displayFormulas(filtered);
}

// ============= NOTES =============
function getDefaultNotes() {
    return [
        { subject: 'Physics', title: 'Motion in a Straight Line', content: '<ul><li>Distance: Total path covered (scalar)</li><li>Displacement: Shortest path (vector)</li><li>Speed: Distance/Time (scalar)</li><li>Velocity: Displacement/Time (vector)</li></ul>' },
        { subject: 'Chemistry', title: 'Atomic Structure', content: '<ul><li>Nucleus: Protons (positive) + Neutrons (neutral)</li><li>Electrons: Negative, revolve around nucleus</li><li>Atomic number (Z): Protons</li></ul>' },
        { subject: 'Maths', title: 'Complex Numbers', content: '<ul><li>Form: z = a + bi where i² = -1</li><li>Modulus: |z| = √(a² + b²)</li><li>Conjugate: z̄ = a - bi</li></ul>' },
    ];
}

function loadNotes() {
    loadNotesSelector();
    displayNotes(notes);
}

function loadNotesSelector() {
    const selector = document.getElementById('notesSelector');
    selector.innerHTML = '';
    
    notes.forEach((note, index) => {
        const item = document.createElement('div');
        item.className = 'note-select-item';
        item.innerHTML = `
            <input type="checkbox" id="note-${index}" onchange="updateNoteSelection(${index})">
            <label for="note-${index}">${note.title}</label>
        `;
        selector.appendChild(item);
    });
}

function displayNotes(notesArray) {
    const container = document.getElementById('notesList');
    container.innerHTML = '';
    
    notesArray.forEach((note, index) => {
        const card = document.createElement('div');
        card.className = 'note-card';
        
        let noteContent = note.content;
        if (note.imageData) {
            noteContent = `<img src="${note.imageData}" alt="${note.title}">` + noteContent;
        }
        
        card.innerHTML = `
            <div class="note-title">
                <span class="note-icon"></span>
                ${note.title}
                <button class="bookmark-btn ${isBookmarked('note', index) ? 'bookmarked' : ''}" 
                        onclick="toggleBookmark('note', ${index}, event)">★</button>
            </div>
            <div class="note-content">${noteContent}</div>
        `;
        container.appendChild(card);
    });
}

function updateNoteSelection(index) {
    const checkbox = document.getElementById(`note-${index}`);
    if (checkbox.checked) {
        selectedNotes.add(index);
    } else {
        selectedNotes.delete(index);
    }
}

function selectAllNotes() {
    notes.forEach((_, index) => {
        document.getElementById(`note-${index}`).checked = true;
        selectedNotes.add(index);
    });
}

function clearNoteSelection() {
    notes.forEach((_, index) => {
        document.getElementById(`note-${index}`).checked = false;
    });
    selectedNotes.clear();
}

function generatePDF() {
    if (selectedNotes.size === 0) {
        alert('Please select at least one note to generate PDF');
        return;
    }
    
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>JEEro - Study Notes</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: Arial, sans-serif; padding: 40px; }');
    printWindow.document.write('h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }');
    printWindow.document.write('h2 { color: #1d4ed8; margin-top: 30px; }');
    printWindow.document.write('ul { line-height: 1.8; }');
    printWindow.document.write('.note { page-break-inside: avoid; margin-bottom: 30px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }');
    printWindow.document.write('img { max-width: 100%; height: auto; }');
    printWindow.document.write('</style></head><body>');
    printWindow.document.write('<h1>JEEro - Study Notes</h1>');
    
    Array.from(selectedNotes).forEach(index => {
        const note = notes[index];
        printWindow.document.write(`<div class="note"><h2>${note.title}</h2>${note.content}</div>`);
    });
    
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

function showPDFModal() {
    const modal = document.getElementById('modal');
    document.getElementById('modalTitle').textContent = 'Generate PDF';
    document.getElementById('modalBody').innerHTML = `
        <p>To generate PDF:</p>
        <ol>
            <li>Go to the Notes tab</li>
            <li>Select the notes you want to include</li>
            <li>Click "Generate PDF" button</li>
            <li>Use browser's print dialog to save as PDF</li>
        </ol>
    `;
    modal.classList.add('active');
}

// ============= PERIODIC TABLE =============
const elements = [
    {n:1,s:'H',name:'Hydrogen',type:'nonmetal',r:1,c:1},{n:2,s:'He',name:'Helium',type:'noble',r:1,c:18},
    {n:3,s:'Li',name:'Lithium',type:'alkali',r:2,c:1},{n:4,s:'Be',name:'Beryllium',type:'alkaline',r:2,c:2},
    {n:5,s:'B',name:'Boron',type:'metalloid',r:2,c:13},{n:6,s:'C',name:'Carbon',type:'nonmetal',r:2,c:14},{n:7,s:'N',name:'Nitrogen',type:'nonmetal',r:2,c:15},{n:8,s:'O',name:'Oxygen',type:'nonmetal',r:2,c:16},{n:9,s:'F',name:'Fluorine',type:'halogen',r:2,c:17},{n:10,s:'Ne',name:'Neon',type:'noble',r:2,c:18},
    {n:11,s:'Na',name:'Sodium',type:'alkali',r:3,c:1},{n:12,s:'Mg',name:'Magnesium',type:'alkaline',r:3,c:2},
    {n:13,s:'Al',name:'Aluminum',type:'post-transition',r:3,c:13},{n:14,s:'Si',name:'Silicon',type:'metalloid',r:3,c:14},{n:15,s:'P',name:'Phosphorus',type:'nonmetal',r:3,c:15},{n:16,s:'S',name:'Sulfur',type:'nonmetal',r:3,c:16},{n:17,s:'Cl',name:'Chlorine',type:'halogen',r:3,c:17},{n:18,s:'Ar',name:'Argon',type:'noble',r:3,c:18},
    {n:19,s:'K',name:'Potassium',type:'alkali',r:4,c:1},{n:20,s:'Ca',name:'Calcium',type:'alkaline',r:4,c:2},
    {n:21,s:'Sc',name:'Scandium',type:'transition',r:4,c:3},{n:22,s:'Ti',name:'Titanium',type:'transition',r:4,c:4},{n:23,s:'V',name:'Vanadium',type:'transition',r:4,c:5},{n:24,s:'Cr',name:'Chromium',type:'transition',r:4,c:6},{n:25,s:'Mn',name:'Manganese',type:'transition',r:4,c:7},{n:26,s:'Fe',name:'Iron',type:'transition',r:4,c:8},{n:27,s:'Co',name:'Cobalt',type:'transition',r:4,c:9},{n:28,s:'Ni',name:'Nickel',type:'transition',r:4,c:10},{n:29,s:'Cu',name:'Copper',type:'transition',r:4,c:11},{n:30,s:'Zn',name:'Zinc',type:'transition',r:4,c:12},
    {n:31,s:'Ga',name:'Gallium',type:'post-transition',r:4,c:13},{n:32,s:'Ge',name:'Germanium',type:'metalloid',r:4,c:14},{n:33,s:'As',name:'Arsenic',type:'metalloid',r:4,c:15},{n:34,s:'Se',name:'Selenium',type:'nonmetal',r:4,c:16},{n:35,s:'Br',name:'Bromine',type:'halogen',r:4,c:17},{n:36,s:'Kr',name:'Krypton',type:'noble',r:4,c:18},
    {n:37,s:'Rb',name:'Rubidium',type:'alkali',r:5,c:1},{n:38,s:'Sr',name:'Strontium',type:'alkaline',r:5,c:2},
    {n:39,s:'Y',name:'Yttrium',type:'transition',r:5,c:3},{n:40,s:'Zr',name:'Zirconium',type:'transition',r:5,c:4},{n:41,s:'Nb',name:'Niobium',type:'transition',r:5,c:5},{n:42,s:'Mo',name:'Molybdenum',type:'transition',r:5,c:6},{n:43,s:'Tc',name:'Technetium',type:'transition',r:5,c:7},{n:44,s:'Ru',name:'Ruthenium',type:'transition',r:5,c:8},{n:45,s:'Rh',name:'Rhodium',type:'transition',r:5,c:9},{n:46,s:'Pd',name:'Palladium',type:'transition',r:5,c:10},{n:47,s:'Ag',name:'Silver',type:'transition',r:5,c:11},{n:48,s:'Cd',name:'Cadmium',type:'transition',r:5,c:12},
    {n:49,s:'In',name:'Indium',type:'post-transition',r:5,c:13},{n:50,s:'Sn',name:'Tin',type:'post-transition',r:5,c:14},{n:51,s:'Sb',name:'Antimony',type:'metalloid',r:5,c:15},{n:52,s:'Te',name:'Tellurium',type:'metalloid',r:5,c:16},{n:53,s:'I',name:'Iodine',type:'halogen',r:5,c:17},{n:54,s:'Xe',name:'Xenon',type:'noble',r:5,c:18},
    {n:55,s:'Cs',name:'Cesium',type:'alkali',r:6,c:1},{n:56,s:'Ba',name:'Barium',type:'alkaline',r:6,c:2},
    {n:57,s:'La',name:'Lanthanum',type:'lanthanide',r:8,c:3},{n:58,s:'Ce',name:'Cerium',type:'lanthanide',r:8,c:4},{n:59,s:'Pr',name:'Praseodymium',type:'lanthanide',r:8,c:5},{n:60,s:'Nd',name:'Neodymium',type:'lanthanide',r:8,c:6},{n:61,s:'Pm',name:'Promethium',type:'lanthanide',r:8,c:7},{n:62,s:'Sm',name:'Samarium',type:'lanthanide',r:8,c:8},{n:63,s:'Eu',name:'Europium',type:'lanthanide',r:8,c:9},{n:64,s:'Gd',name:'Gadolinium',type:'lanthanide',r:8,c:10},{n:65,s:'Tb',name:'Terbium',type:'lanthanide',r:8,c:11},{n:66,s:'Dy',name:'Dysprosium',type:'lanthanide',r:8,c:12},{n:67,s:'Ho',name:'Holmium',type:'lanthanide',r:8,c:13},{n:68,s:'Er',name:'Erbium',type:'lanthanide',r:8,c:14},{n:69,s:'Tm',name:'Thulium',type:'lanthanide',r:8,c:15},{n:70,s:'Yb',name:'Ytterbium',type:'lanthanide',r:8,c:16},{n:71,s:'Lu',name:'Lutetium',type:'lanthanide',r:8,c:17},
    {n:72,s:'Hf',name:'Hafnium',type:'transition',r:6,c:4},{n:73,s:'Ta',name:'Tantalum',type:'transition',r:6,c:5},{n:74,s:'W',name:'Tungsten',type:'transition',r:6,c:6},{n:75,s:'Re',name:'Rhenium',type:'transition',r:6,c:7},{n:76,s:'Os',name:'Osmium',type:'transition',r:6,c:8},{n:77,s:'Ir',name:'Iridium',type:'transition',r:6,c:9},{n:78,s:'Pt',name:'Platinum',type:'transition',r:6,c:10},{n:79,s:'Au',name:'Gold',type:'transition',r:6,c:11},{n:80,s:'Hg',name:'Mercury',type:'transition',r:6,c:12},
    {n:81,s:'Tl',name:'Thallium',type:'post-transition',r:6,c:13},{n:82,s:'Pb',name:'Lead',type:'post-transition',r:6,c:14},{n:83,s:'Bi',name:'Bismuth',type:'post-transition',r:6,c:15},{n:84,s:'Po',name:'Polonium',type:'metalloid',r:6,c:16},{n:85,s:'At',name:'Astatine',type:'halogen',r:6,c:17},{n:86,s:'Rn',name:'Radon',type:'noble',r:6,c:18},
    {n:87,s:'Fr',name:'Francium',type:'alkali',r:7,c:1},{n:88,s:'Ra',name:'Radium',type:'alkaline',r:7,c:2},
    {n:89,s:'Ac',name:'Actinium',type:'actinide',r:9,c:3},{n:90,s:'Th',name:'Thorium',type:'actinide',r:9,c:4},{n:91,s:'Pa',name:'Protactinium',type:'actinide',r:9,c:5},{n:92,s:'U',name:'Uranium',type:'actinide',r:9,c:6},{n:93,s:'Np',name:'Neptunium',type:'actinide',r:9,c:7},{n:94,s:'Pu',name:'Plutonium',type:'actinide',r:9,c:8},{n:95,s:'Am',name:'Americium',type:'actinide',r:9,c:9},{n:96,s:'Cm',name:'Curium',type:'actinide',r:9,c:10},{n:97,s:'Bk',name:'Berkelium',type:'actinide',r:9,c:11},{n:98,s:'Cf',name:'Californium',type:'actinide',r:9,c:12},{n:99,s:'Es',name:'Einsteinium',type:'actinide',r:9,c:13},{n:100,s:'Fm',name:'Fermium',type:'actinide',r:9,c:14},{n:101,s:'Md',name:'Mendelevium',type:'actinide',r:9,c:15},{n:102,s:'No',name:'Nobelium',type:'actinide',r:9,c:16},{n:103,s:'Lr',name:'Lawrencium',type:'actinide',r:9,c:17},
    {n:104,s:'Rf',name:'Rutherfordium',type:'transition',r:7,c:4},{n:105,s:'Db',name:'Dubnium',type:'transition',r:7,c:5},{n:106,s:'Sg',name:'Seaborgium',type:'transition',r:7,c:6},{n:107,s:'Bh',name:'Bohrium',type:'transition',r:7,c:7},{n:108,s:'Hs',name:'Hassium',type:'transition',r:7,c:8},{n:109,s:'Mt',name:'Meitnerium',type:'transition',r:7,c:9},{n:110,s:'Ds',name:'Darmstadtium',type:'transition',r:7,c:10},{n:111,s:'Rg',name:'Roentgenium',type:'transition',r:7,c:11},{n:112,s:'Cn',name:'Copernicium',type:'transition',r:7,c:12},
    {n:113,s:'Nh',name:'Nihonium',type:'post-transition',r:7,c:13},{n:114,s:'Fl',name:'Flerovium',type:'post-transition',r:7,c:14},{n:115,s:'Mc',name:'Moscovium',type:'post-transition',r:7,c:15},{n:116,s:'Lv',name:'Livermorium',type:'post-transition',r:7,c:16},{n:117,s:'Ts',name:'Tennessine',type:'halogen',r:7,c:17},{n:118,s:'Og',name:'Oganesson',type:'noble',r:7,c:18}
];

let allElements = [];

function loadPeriodicTable() {
    const container = document.getElementById('periodicTable');
    container.innerHTML = '';
    allElements = [];
    
    elements.forEach(el => {
        const div = document.createElement('div');
        div.className = `element ${el.type}`;
        div.style.gridRow = el.r;
        div.style.gridColumn = el.c;
        div.innerHTML = `
            <div class="element-number">${el.n}</div>
            <div class="element-symbol">${el.s}</div>
            <div class="element-name">${el.name}</div>
        `;
        div.onclick = () => showElementInfo(el);
        container.appendChild(div);
        allElements.push({div, el});
    });
}

function searchElements() {
    const query = document.getElementById('elementSearch').value.toLowerCase();
    
    allElements.forEach(({div, el}) => {
        const match = el.name.toLowerCase().includes(query) || 
                     el.s.toLowerCase().includes(query) ||
                     el.n.toString().includes(query);
        
        div.style.opacity = match || query === '' ? '1' : '0.2';
    });
}

function showElementInfo(el) {
    const info = `
        <p><strong>Atomic Number:</strong> ${el.n}</p>
        <p><strong>Symbol:</strong> ${el.s}</p>
        <p><strong>Name:</strong> ${el.name}</p>
        <p><strong>Category:</strong> ${el.type}</p>
    `;
    openModal(el.name, info);
}

// ============= CONSTANTS =============
const constants = [
    {name:'Speed of Light',symbol:'c',value:'3.00 × 10⁸',unit:'m/s'},
    {name:'Gravitational Constant',symbol:'G',value:'6.674 × 10⁻¹¹',unit:'N·m²/kg²'},
    {name:'Planck\'s Constant',symbol:'h',value:'6.626 × 10⁻³⁴',unit:'J·s'},
    {name:'Avogadro\'s Number',symbol:'Nₐ',value:'6.022 × 10²³',unit:'mol⁻¹'},
    {name:'Gas Constant',symbol:'R',value:'8.314',unit:'J/(mol·K)'},
];

let allConstants = [];

function loadConstants() {
    displayConstants(constants);
}

function displayConstants(constsArray) {
    const container = document.getElementById('constantsList');
    container.innerHTML = '';
    allConstants = [];
    
    constsArray.forEach((c, index) => {
        const card = document.createElement('div');
        card.className = 'constant-card';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div class="constant-name">${c.name} (${c.symbol})</div>
                <button class="bookmark-btn ${isBookmarked('constant', index) ? 'bookmarked' : ''}" 
                        onclick="toggleBookmark('constant', ${index}, event)">★</button>
            </div>
            <div class="constant-value">${c.value}</div>
            <div class="constant-unit">${c.unit}</div>
        `;
        container.appendChild(card);
        allConstants.push({card, c, index});
    });
}

function searchConstants() {
    const query = document.getElementById('constantSearch').value.toLowerCase();
    
    allConstants.forEach(({card, c}) => {
        const match = c.name.toLowerCase().includes(query) || 
                     c.symbol.toLowerCase().includes(query);
        
        card.style.display = match || query === '' ? 'block' : 'none';
    });
}

// ============= TIMER =============
function setTimer(minutes) {
    timerSeconds = minutes * 60;
    updateTimerDisplay();
    if (timerRunning) pauseTimer();
}

function updateTimerDisplay() {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    document.getElementById('timerDisplay').textContent = 
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (!timerRunning) {
        timerRunning = true;
        timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
                timerSeconds--;
                updateTimerDisplay();
            } else {
                pauseTimer();
                alert('⏰ Time\'s up! Take a break!');
            }
        }, 1000);
    }
}

function pauseTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
}

function resetTimer() {
    pauseTimer();
    timerSeconds = 1500;
    updateTimerDisplay();
}

// ============= BOOKMARKS =============
function toggleBookmark(type, index, event) {
    event.stopPropagation();
    const bookmarkId = `${type}-${index}`;
    const bookmarkIndex = bookmarks.findIndex(b => b.id === bookmarkId);
    
    if (bookmarkIndex > -1) {
        bookmarks.splice(bookmarkIndex, 1);
    } else {
        let item;
        if (type === 'formula') item = formulas[index];
        else if (type === 'note') item = notes[index];
        else if (type === 'constant') item = constants[index];
        
        bookmarks.push({id: bookmarkId, type, index, item});
    }
    
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    event.target.classList.toggle('bookmarked');
    
    if (document.getElementById('bookmarks').classList.contains('active')) {
        loadBookmarks();
    }
}

function isBookmarked(type, index) {
    return bookmarks.some(b => b.id === `${type}-${index}`);
}

function loadBookmarks() {
    const container = document.getElementById('bookmarksList');
    container.innerHTML = '';
    
    if (bookmarks.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">No bookmarks yet! Start bookmarking your favorites.</div>';
        return;
    }
    
    bookmarks.forEach(b => {
        if (b.type === 'formula') {
            const card = document.createElement('div');
            card.className = 'formula-card';
            card.innerHTML = `
                <div class="formula-header">
                    <div class="formula-title">${b.item.title}</div>
                    <button class="bookmark-btn bookmarked" onclick="toggleBookmark('${b.type}', ${b.index}, event)">★</button>
                </div>
                <div class="formula-content">${b.item.formula}</div>
            `;
            container.appendChild(card);
        }
    });
}

// ============= ADMIN FUNCTIONS =============
function handleFormulaImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            formulaImageData = e.target.result;
            document.getElementById('formulaImagePreview').innerHTML = 
                `<img src="${formulaImageData}" style="max-width: 100%; margin-top: 10px; border-radius: 6px;">`;
        };
        reader.readAsDataURL(file);
    }
}

function handleNoteImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            noteImageData = e.target.result;
            document.getElementById('noteImagePreview').innerHTML = 
                `<img src="${noteImageData}" style="max-width: 100%; margin-top: 10px; border-radius: 6px;">`;
        };
        reader.readAsDataURL(file);
    }
}

function addFormula() {
    const formula = {
        subject: document.getElementById('formulaSubject').value,
        category: document.getElementById('formulaCategory').value,
        title: document.getElementById('formulaTitle').value,
        formula: document.getElementById('formulaText').value,
        description: document.getElementById('formulaDescription').value,
        imageData: formulaImageData
    };
    
    if (!formula.title) {
        alert('Please enter a title');
        return;
    }
    
    formulas.push(formula);
    localStorage.setItem('formulas', JSON.stringify(formulas));
    
    // Clear form
    document.getElementById('formulaCategory').value = '';
    document.getElementById('formulaTitle').value = '';
    document.getElementById('formulaText').value = '';
    document.getElementById('formulaDescription').value = '';
    document.getElementById('formulaImagePreview').innerHTML = '';
    formulaImageData = null;
    
    alert('Formula added successfully!');
    loadFormulas();
}

function addNote() {
    const note = {
        subject: document.getElementById('noteSubject').value,
        title: document.getElementById('noteTitle').value,
        content: document.getElementById('noteContent').value,
        imageData: noteImageData
    };
    
    if (!note.title) {
        alert('Please enter a title');
        return;
    }
    
    notes.push(note);
    localStorage.setItem('notes', JSON.stringify(notes));
    
    // Clear form
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('noteImagePreview').innerHTML = '';
    noteImageData = null;
    
    alert('Note added successfully!');
    loadNotes();
}

function loadAdminStats() {
    // Get all users from localStorage (in real app, this would come from Google Sheets)
    const stats = {
        total: 0,
        jee: 0,
        neet: 0,
        other: 0
    };
    
    if (userData) {
        stats.total = 1;
        if (userData.exam === 'JEE') stats.jee = 1;
        else if (userData.exam === 'NEET') stats.neet = 1;
        else stats.other = 1;
    }
    
    document.getElementById('totalStudents').textContent = stats.total;
    document.getElementById('jeeStudents').textContent = stats.jee;
    document.getElementById('neetStudents').textContent = stats.neet;
    document.getElementById('otherStudents').textContent = stats.other;
}

function viewStudentList() {
    if (!userData) {
        alert('No students registered yet');
        return;
    }
    
    const info = `
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid var(--border);">
                <th style="text-align: left; padding: 8px;">Name</th>
                <td style="padding: 8px;">${userData.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--border);">
                <th style="text-align: left; padding: 8px;">Age</th>
                <td style="padding: 8px;">${userData.age}</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--border);">
                <th style="text-align: left; padding: 8px;">Exam</th>
                <td style="padding: 8px;">${userData.exam}</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--border);">
                <th style="text-align: left; padding: 8px;">Class</th>
                <td style="padding: 8px;">${userData.class}</td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 8px;">Registered</th>
                <td style="padding: 8px;">${new Date(userData.registrationDate).toLocaleDateString()}</td>
            </tr>
        </table>
    `;
    openModal('Student Details', info);
}

function exportToGoogleSheets() {
    if (!GOOGLE_SHEETS_URL || GOOGLE_SHEETS_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
        alert('Please configure Google Sheets URL in the code first!');
        return;
    }
    
    sendUserToGoogleSheets(userData);
    alert('Data exported to Google Sheets!');
}

function exportContent() {
    const data = {
        formulas: formulas,
        notes: notes,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jeero-content-backup.json';
    a.click();
}

function clearAllContent() {
    if (confirm('Are you sure? This will delete all formulas and notes!')) {
        if (confirm('This action cannot be undone. Are you really sure?')) {
            localStorage.removeItem('formulas');
            localStorage.removeItem('notes');
            formulas = getDefaultFormulas();
            notes = getDefaultNotes();
            alert('All content cleared!');
            loadFormulas();
            loadNotes();
        }
    }
}

// View and manage all formulas
function viewAllFormulas() {
    let html = '<div class="content-list">';
    
    if (formulas.length === 0) {
        html += '<div style="padding: 40px; text-align: center; color: var(--text-muted);">No formulas yet</div>';
    } else {
        formulas.forEach((formula, index) => {
            html += `
                <div class="content-item">
                    <div class="content-item-info">
                        <div class="content-item-title">${formula.title}</div>
                        <div class="content-item-meta">
                            ${formula.subject.toUpperCase()} - ${formula.category}
                            ${formula.imageData ? ' • Has Image' : ' • Text: ' + formula.formula.substring(0, 30) + '...'}
                        </div>
                    </div>
                    <div class="content-item-actions">
                        <button class="btn-view" onclick="viewFormulaDetail(${index})">View</button>
                        <button class="btn-delete" onclick="deleteFormula(${index})">Delete</button>
                    </div>
                </div>
            `;
        });
    }
    
    html += '</div>';
    html += '<div style="margin-top: 16px;"><button class="btn btn-primary" onclick="closeModal()">Close</button></div>';
    
    openModal('Manage Formulas (' + formulas.length + ' total)', html);
}

// View and manage all notes
function viewAllNotes() {
    let html = '<div class="content-list">';
    
    if (notes.length === 0) {
        html += '<div style="padding: 40px; text-align: center; color: var(--text-muted);">No notes yet</div>';
    } else {
        notes.forEach((note, index) => {
            const contentPreview = note.content.replace(/<[^>]*>/g, '').substring(0, 50);
            html += `
                <div class="content-item">
                    <div class="content-item-info">
                        <div class="content-item-title">${note.title}</div>
                        <div class="content-item-meta">
                            ${note.subject}
                            ${note.imageData ? ' • Has Image/PDF' : ' • Text: ' + contentPreview + '...'}
                        </div>
                    </div>
                    <div class="content-item-actions">
                        <button class="btn-view" onclick="viewNoteDetail(${index})">View</button>
                        <button class="btn-delete" onclick="deleteNote(${index})">Delete</button>
                    </div>
                </div>
            `;
        });
    }
    
    html += '</div>';
    html += '<div style="margin-top: 16px;"><button class="btn btn-primary" onclick="closeModal()">Close</button></div>';
    
    openModal('Manage Notes (' + notes.length + ' total)', html);
}

// Delete a specific formula
function deleteFormula(index) {
    const formula = formulas[index];
    if (confirm(`Delete formula: "${formula.title}"?`)) {
        formulas.splice(index, 1);
        localStorage.setItem('formulas', JSON.stringify(formulas));
        alert('Formula deleted successfully!');
        viewAllFormulas(); // Refresh the list
        loadFormulas(); // Refresh the formulas page
    }
}

// Delete a specific note
function deleteNote(index) {
    const note = notes[index];
    if (confirm(`Delete note: "${note.title}"?`)) {
        notes.splice(index, 1);
        localStorage.setItem('notes', JSON.stringify(notes));
        
        // Also remove from bookmarks if bookmarked
        bookmarks = bookmarks.filter(b => !(b.type === 'note' && b.index === index));
        // Update bookmark indices for notes after the deleted one
        bookmarks.forEach(b => {
            if (b.type === 'note' && b.index > index) {
                b.index--;
            }
        });
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
        
        alert('Note deleted successfully!');
        viewAllNotes(); // Refresh the list
        loadNotes(); // Refresh the notes page
    }
}

// View formula details
function viewFormulaDetail(index) {
    const formula = formulas[index];
    let html = `
        <div style="margin-bottom: 16px;">
            <strong>Subject:</strong> ${formula.subject.toUpperCase()}<br>
            <strong>Category:</strong> ${formula.category}<br>
            <strong>Description:</strong> ${formula.description}
        </div>
    `;
    
    if (formula.imageData) {
        html += `<img src="${formula.imageData}" style="max-width: 100%; border-radius: 8px; margin: 16px 0;">`;
    } else {
        html += `<div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; font-family: 'Fira Code', monospace; margin: 16px 0;">${formula.formula}</div>`;
    }
    
    html += `
        <div style="margin-top: 20px; display: flex; gap: 10px;">
            <button class="btn btn-primary" onclick="viewAllFormulas()">Back to List</button>
            <button class="btn btn-danger" onclick="deleteFormula(${index})">Delete This Formula</button>
        </div>
    `;
    
    openModal(formula.title, html);
}

// View note details
function viewNoteDetail(index) {
    const note = notes[index];
    let html = `
        <div style="margin-bottom: 16px;">
            <strong>Subject:</strong> ${note.subject}
        </div>
    `;
    
    if (note.imageData) {
        html += `<img src="${note.imageData}" style="max-width: 100%; border-radius: 8px; margin: 16px 0;">`;
    }
    
    html += `<div style="margin: 16px 0;">${note.content}</div>`;
    
    html += `
        <div style="margin-top: 20px; display: flex; gap: 10px;">
            <button class="btn btn-primary" onclick="viewAllNotes()">Back to List</button>
            <button class="btn btn-danger" onclick="deleteNote(${index})">Delete This Note</button>
        </div>
    `;
    
    openModal(note.title, html);
}

// ============= MODAL =============
function openModal(title, body) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = body;
    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
    
    if (document.getElementById('calculator').classList.contains('active')) {
        if (e.key >= '0' && e.key <= '9') appendNumber(e.key);
        if (e.key === '.') appendNumber('.');
        if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') appendOperator(e.key);
        if (e.key === 'Enter') calculate();
        if (e.key === 'Backspace' && e.target.tagName !== 'INPUT') deleteChar();
        if (e.key === 'Escape') clearCalc();
    }
});

// Helper function for easy admin access from console
function openAdmin() {
    showTab('admin');
}

// Log helpful message to console
console.log('%c🎓 JEEro App - Developer Console', 'color: #2563eb; font-size: 16px; font-weight: bold;');
console.log('%cTo access admin panel, type: openAdmin()', 'color: #059669; font-size: 14px;');
console.log('%cOr use: showTab("admin")', 'color: #059669; font-size: 14px;');