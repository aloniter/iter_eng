import React, { useState, useEffect, useRef } from 'react';

const ItarApp = () => {
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [currentProject, setCurrentProject] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [editingImage, setEditingImage] = useState(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#ff0000');
  const [lineWidth, setLineWidth] = useState(3);
  const [drawingTool, setDrawingTool] = useState('pen');
  const [startPoint, setStartPoint] = useState(null);
  const [showExportSettings, setShowExportSettings] = useState(false);
  const [exportSettings, setExportSettings] = useState({
    header: 'איטר הנדסה והניהול פרויקטים',
    footer: 'טל: 050-1234567 | info@itar.co.il'
  });

  // טעינת פרויקטים מ-localStorage כשהאפליקציה נטענת
  useEffect(() => {
    const saved = localStorage.getItem('itarProjects');
    if (saved) {
      const loadedProjects = JSON.parse(saved);
      // תיקון תמונות ישנות - הוספת note אם חסר
      const fixedProjects = loadedProjects.map(project => ({
        ...project,
        images: project.images.map(img => ({
          ...img,
          note: img.note || ''
        }))
      }));
      setProjects(fixedProjects);
    }
  }, []);

  // שמירת פרויקטים ל-localStorage בכל שינוי
  useEffect(() => {
    localStorage.setItem('itarProjects', JSON.stringify(projects));
  }, [projects]);

  const openModal = () => {
    setShowModal(true);
    setProjectName('');
  };

  const closeModal = () => {
    setShowModal(false);
    setProjectName('');
  };

  const createProject = () => {
    if (projectName && projectName.trim()) {
      const newProject = {
        id: Date.now(),
        name: projectName.trim(),
        createdAt: new Date().toISOString(),
        images: []
      };
      setProjects([...projects, newProject]);
      closeModal();
    }
  };

  const openProject = (project) => {
    setCurrentProject(project);
  };

  const closeProject = () => {
    setCurrentProject(null);
  };

  const deleteProject = (id) => {
    setProjects(projects.filter(p => p.id !== id));
    if (currentProject?.id === id) {
      setCurrentProject(null);
    }
    setDeleteConfirm(null);
  };

  const askDelete = (project) => {
    setDeleteConfirm(project);
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const deleteImage = (imageId) => {
    const updatedProject = {
      ...currentProject,
      images: currentProject.images.filter(img => img.id !== imageId)
    };
    
    setProjects(projects.map(p => 
      p.id === currentProject.id ? updatedProject : p
    ));
    
    setCurrentProject(updatedProject);
  };

  const updateImageNote = (imageId, note) => {
    const updatedProject = {
      ...currentProject,
      images: currentProject.images.map(img =>
        img.id === imageId ? { ...img, note } : img
      )
    };
    
    setProjects(projects.map(p => 
      p.id === currentProject.id ? updatedProject : p
    ));
    
    setCurrentProject(updatedProject);
  };

  const openImageEditor = (image) => {
    setEditingImage(image);
    
    // טוען את התמונה ל-canvas
    setTimeout(() => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        };
        
        img.src = image.data;
      }
    }, 100);
  };

  const closeImageEditor = () => {
    setEditingImage(null);
  };

  const saveEditedImage = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const editedData = canvas.toDataURL('image/jpeg', 0.8);
    
    const updatedProject = {
      ...currentProject,
      images: currentProject.images.map(img =>
        img.id === editingImage.id ? { ...img, data: editedData } : img
      )
    };
    
    setProjects(projects.map(p => 
      p.id === currentProject.id ? updatedProject : p
    ));
    
    setCurrentProject(updatedProject);
    setEditingImage(null);
  };

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    return { x, y };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    
    if (drawingTool === 'pen') {
      const ctx = canvasRef.current.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (drawingTool === 'arrow' || drawingTool === 'circle') {
      setStartPoint({ x, y });
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    if (drawingTool === 'pen') {
      const { x, y } = getCanvasCoordinates(e);
      const ctx = canvasRef.current.getContext('2d');
      
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    
    if ((drawingTool === 'arrow' || drawingTool === 'circle') && startPoint) {
      e.preventDefault();
      const { x, y } = getCanvasCoordinates(e);
      
      if (drawingTool === 'arrow') {
        drawArrow(startPoint.x, startPoint.y, x, y);
      } else if (drawingTool === 'circle') {
        drawCircle(startPoint.x, startPoint.y, x, y);
      }
      
      setStartPoint(null);
    }
    
    setIsDrawing(false);
  };

  const drawArrow = (fromX, fromY, toX, toY) => {
    const ctx = canvasRef.current.getContext('2d');
    const headLen = 20 + lineWidth * 2;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    ctx.strokeStyle = drawColor;
    ctx.fillStyle = drawColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    
    // קו החץ
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    
    // ראש החץ
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLen * Math.cos(angle - Math.PI / 6),
      toY - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLen * Math.cos(angle + Math.PI / 6),
      toY - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.lineTo(toX, toY);
    ctx.fill();
  };

  const drawCircle = (startX, startY, endX, endY) => {
    const ctx = canvasRef.current.getContext('2d');
    const radius = Math.sqrt(
      Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
    );
    
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
    ctx.stroke();
  };

  const exportToPDF = async () => {
    // בדיקה אם jsPDF כבר קיים
    if (window.jspdf) {
      generatePDF();
      return;
    }
    
    // טוען את ספריית jsPDF
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => generatePDF();
    script.onerror = () => alert('שגיאה בטעינת ספריית PDF. נסה שוב.');
    document.head.appendChild(script);
  };

  const generatePDF = () => {
    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const headerHeight = 20;
      const footerHeight = 15;
      const contentHeight = pageHeight - headerHeight - footerHeight - (margin * 2);
      
      const imageWidth = 80;
      const imageHeight = contentHeight / 2 - 10;
      
      const images = currentProject.images;
      let pageNum = 1;
      const totalPages = Math.ceil(images.length / 4);
      
      // עבור כל 4 תמונות (2 בכל עמוד)
      for (let i = 0; i < images.length; i += 4) {
        if (i > 0) pdf.addPage();
        
        // כותרת עליונה
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text(exportSettings.header, pageWidth / 2, margin, { align: 'center' });
        
        pdf.setFontSize(10);
        pdf.text(`${currentProject.name} | ${new Date().toLocaleDateString('he-IL')}`, pageWidth / 2, margin + 7, { align: 'center' });
        
        pdf.setDrawColor(0);
        pdf.line(margin, headerHeight, pageWidth - margin, headerHeight);
        
        const batch = images.slice(i, i + 4);
        
        // הוספת תמונות
        for (let j = 0; j < batch.length; j++) {
          const img = batch[j];
          const row = Math.floor(j / 2);
          
          const x = margin;
          const y = headerHeight + margin + (row * (imageHeight + 20));
          const textX = margin + imageWidth + 10;
          
          try {
            pdf.addImage(img.data, 'JPEG', x, y, imageWidth, imageHeight);
          } catch (e) {
            console.error('שגיאה בהוספת תמונה:', e);
          }
          
          // מידע על התמונה מימין
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(12);
          pdf.text(`תמונה #${i + j + 1}`, pageWidth - margin, y + 5, { align: 'right' });
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.text(`תאריך: ${new Date(img.createdAt).toLocaleDateString('he-IL')}`, pageWidth - margin, y + 12, { align: 'right' });
          
          // הערות
          if (img.note) {
            pdf.setFontSize(9);
            const lines = pdf.splitTextToSize(img.note, 80);
            pdf.text('הערות:', pageWidth - margin, y + 19, { align: 'right' });
            let noteY = y + 25;
            for (let line of lines) {
              if (noteY < y + imageHeight) {
                pdf.text(line, pageWidth - margin, noteY, { align: 'right' });
                noteY += 5;
              }
            }
          }
        }
        
        // תחתית
        pdf.setDrawColor(0);
        pdf.line(margin, pageHeight - footerHeight, pageWidth - margin, pageHeight - footerHeight);
        
        pdf.setFontSize(9);
        pdf.text(exportSettings.footer, pageWidth / 2, pageHeight - 7, { align: 'center' });
        pdf.text(`עמוד ${pageNum} מתוך ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
        
        pageNum++;
      }
      
      pdf.save(`${currentProject.name}.pdf`);
    } catch (error) {
      console.error('שגיאה ביצירת PDF:', error);
      alert('שגיאה ביצירת PDF. בדוק את הקונסול לפרטים.');
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // הקטנה ל-1920px מקסימום
          const maxDimension = 1920;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // דחיסה לאיכות 0.7 (טובה מאוד אבל קובץ קטן)
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressed);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    const newImages = [];
    
    if (files.length === 0) return;
    
    // דחיסת כל התמונות
    for (const file of files) {
      const compressed = await compressImage(file);
      newImages.push({
        id: Date.now() + Math.random(),
        data: compressed,
        name: file.name,
        note: '',
        createdAt: new Date().toISOString()
      });
    }
    
    // עדכון הפרויקט עם כל התמונות
    const updatedProject = {
      ...currentProject,
      images: [...currentProject.images, ...newImages]
    };
    
    setProjects(projects.map(p => 
      p.id === currentProject.id ? updatedProject : p
    ));
    
    setCurrentProject(updatedProject);
    
    // נקה את ה-input
    e.target.value = '';
  };

  // אם פרויקט פתוח - הצג את מסך הפרויקט
  if (currentProject) {
    // אם עורך תמונות פתוח
    if (editingImage) {
      return (
        <div className="min-h-screen bg-gray-900 p-4" dir="rtl">
          <div className="max-w-6xl mx-auto">
            {/* כותרת העורך */}
            <div className="bg-white p-4 rounded-lg shadow-lg mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">עריכת תמונה</h2>
                <div className="flex gap-3">
                  <button
                    onClick={closeImageEditor}
                    className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 font-bold"
                  >
                    ✗ ביטול
                  </button>
                  <button
                    onClick={saveEditedImage}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold"
                  >
                    ✓ שמור
                  </button>
                </div>
              </div>
              
              {/* כלי ציור */}
              <div className="flex flex-wrap gap-3 items-center border-t pt-4">
                {/* בחירת כלי */}
                <div className="flex items-center gap-2">
                  <label className="font-bold text-sm">כלי:</label>
                  <button
                    onClick={() => setDrawingTool('pen')}
                    className={`px-4 py-2 rounded border-2 font-bold ${drawingTool === 'pen' ? 'bg-black text-white border-black' : 'bg-white border-gray-300'}`}
                  >
                    🖊️ עט
                  </button>
                  <button
                    onClick={() => setDrawingTool('arrow')}
                    className={`px-4 py-2 rounded border-2 font-bold ${drawingTool === 'arrow' ? 'bg-black text-white border-black' : 'bg-white border-gray-300'}`}
                  >
                    ➡️ חץ
                  </button>
                  <button
                    onClick={() => setDrawingTool('circle')}
                    className={`px-4 py-2 rounded border-2 font-bold ${drawingTool === 'circle' ? 'bg-black text-white border-black' : 'bg-white border-gray-300'}`}
                  >
                    ⭕ עיגול
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="font-bold text-sm">צבע:</label>
                  <button
                    onClick={() => setDrawColor('#ff0000')}
                    className={`w-10 h-10 rounded border-2 ${drawColor === '#ff0000' ? 'border-black' : 'border-gray-300'}`}
                    style={{ backgroundColor: '#ff0000' }}
                    title="אדום"
                  />
                  <button
                    onClick={() => setDrawColor('#0000ff')}
                    className={`w-10 h-10 rounded border-2 ${drawColor === '#0000ff' ? 'border-black' : 'border-gray-300'}`}
                    style={{ backgroundColor: '#0000ff' }}
                    title="כחול"
                  />
                  <button
                    onClick={() => setDrawColor('#00ff00')}
                    className={`w-10 h-10 rounded border-2 ${drawColor === '#00ff00' ? 'border-black' : 'border-gray-300'}`}
                    style={{ backgroundColor: '#00ff00' }}
                    title="ירוק"
                  />
                  <button
                    onClick={() => setDrawColor('#000000')}
                    className={`w-10 h-10 rounded border-2 ${drawColor === '#000000' ? 'border-black' : 'border-gray-300'}`}
                    style={{ backgroundColor: '#000000' }}
                    title="שחור"
                  />
                  <button
                    onClick={() => setDrawColor('#ffff00')}
                    className={`w-10 h-10 rounded border-2 ${drawColor === '#ffff00' ? 'border-black' : 'border-gray-300'}`}
                    style={{ backgroundColor: '#ffff00' }}
                    title="צהוב"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="font-bold text-sm">עובי:</label>
                  <button
                    onClick={() => setLineWidth(2)}
                    className={`px-3 py-2 rounded border-2 ${lineWidth === 2 ? 'bg-black text-white border-black' : 'bg-white border-gray-300'}`}
                  >
                    דק
                  </button>
                  <button
                    onClick={() => setLineWidth(4)}
                    className={`px-3 py-2 rounded border-2 ${lineWidth === 4 ? 'bg-black text-white border-black' : 'bg-white border-gray-300'}`}
                  >
                    בינוני
                  </button>
                  <button
                    onClick={() => setLineWidth(8)}
                    className={`px-3 py-2 rounded border-2 ${lineWidth === 8 ? 'bg-black text-white border-black' : 'bg-white border-gray-300'}`}
                  >
                    עבה
                  </button>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="overflow-auto">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="max-w-full border-2 border-gray-300 rounded cursor-crosshair touch-none"
                />
              </div>
              
              <div className="mt-4 bg-green-50 p-4 rounded-lg border-2 border-green-200">
                <h3 className="font-bold text-green-900 mb-2">✅ בדיקות למשימה 4.4:</h3>
                <ul className="space-y-1 text-green-800 text-sm">
                  <li>✓ <strong>עט:</strong> ציור חופשי</li>
                  <li>✓ <strong>חץ:</strong> לחץ וגרור ליצירת חץ</li>
                  <li>✓ <strong>עיגול:</strong> לחץ במרכז וגרור החוצה!</li>
                  <li>✓ הרדיוס של העיגול תלוי במרחק שגררת</li>
                  <li>✓ כל הכלים עובדים עם כל הצבעים והעוביים</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
        <div className="max-w-6xl mx-auto">
          {/* כותרת הפרויקט */}
          <div className="bg-black text-white p-6 rounded-lg shadow-lg mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{currentProject.name}</h1>
                <p className="text-gray-300">
                  📷 {currentProject.images.length} תמונות | 
                  📅 נוצר ב-{new Date(currentProject.createdAt).toLocaleDateString('he-IL')}
                </p>
              </div>
              <button
                onClick={closeProject}
                className="bg-white text-black px-6 py-3 rounded-lg hover:bg-gray-200 font-bold"
              >
                ← חזרה
              </button>
            </div>
          </div>

          {/* תוכן הפרויקט */}
          <div className="space-y-6">
            {/* כפתורי פעולה */}
            <div className="bg-white p-4 rounded-lg shadow-lg mb-6">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="camera"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="bg-black text-white p-4 rounded-lg hover:bg-gray-800 font-bold text-lg"
                >
                  📷 צלם
                </button>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-black text-white p-4 rounded-lg hover:bg-gray-800 font-bold text-lg"
                >
                  📤 גלריה
                </button>
              </div>
              
              {/* כפתורי יצוא */}
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowExportSettings(!showExportSettings)}
                  className="w-full bg-gray-700 text-white p-3 rounded-lg hover:bg-gray-600 font-bold mb-3"
                >
                  ⚙️ הגדרות יצוא
                </button>
                
                {showExportSettings && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <h3 className="font-bold mb-3">הגדרות PDF</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">כותרת עליונה:</label>
                        <input
                          type="text"
                          value={exportSettings.header}
                          onChange={(e) => setExportSettings({...exportSettings, header: e.target.value})}
                          className="w-full p-2 border-2 border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">תחתית עמוד:</label>
                        <input
                          type="text"
                          value={exportSettings.footer}
                          onChange={(e) => setExportSettings({...exportSettings, footer: e.target.value})}
                          className="w-full p-2 border-2 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={exportToPDF}
                  disabled={currentProject.images.length === 0}
                  className="w-full bg-red-600 text-white p-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold text-lg"
                >
                  📄 יצא ל-PDF
                </button>
              </div>
            </div>

            {/* הצגת תמונות */}
            {currentProject.images.length === 0 ? (
              <div className="bg-white p-12 rounded-lg shadow-lg text-center">
                <div className="text-6xl mb-4">📸</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">אין תמונות עדיין</h2>
                <p className="text-gray-600 mb-6">לחץ על "צלם" או "גלריה" כדי להתחיל</p>
                
                <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200 text-right">
                  <h3 className="font-bold text-green-900 mb-3">✅ בדיקות למשימה 2.2:</h3>
                  <ul className="space-y-2 text-green-800">
                    <li>✓ במובייל - לחץ "צלם" ← צריך לפתוח מצלמה</li>
                    <li>✓ לחץ "גלריה" ← בחר תמונות קיימות</li>
                    <li>✓ בחר כמה תמונות ביחד - כולן צריכות להופיע</li>
                    <li>✓ התמונות נדחסות אוטומטית!</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {currentProject.images.map((image, index) => (
                  <div key={image.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="flex flex-col md:flex-row gap-4 p-4">
                      {/* תמונה משמאל */}
                      <div className="flex-shrink-0">
                        <img
                          src={image.data}
                          alt={`תמונה ${index + 1}`}
                          className="w-full md:w-64 h-48 object-cover rounded cursor-pointer hover:opacity-80 transition"
                          onClick={() => openImageEditor(image)}
                          title="לחץ לעריכה"
                        />
                        <button
                          onClick={() => openImageEditor(image)}
                          className="w-full mt-2 bg-black text-white py-2 rounded hover:bg-gray-800 font-bold"
                        >
                          ✏️ ערוך תמונה
                        </button>
                      </div>
                      
                      {/* מידע מימין */}
                      <div className="flex-1 flex flex-col">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">
                              תמונה #{index + 1}
                            </h3>
                            <p className="text-sm text-gray-600">
                              📅 {new Date(image.createdAt).toLocaleDateString('he-IL')} | 
                              🕐 {new Date(image.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteImage(image.id)}
                            className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 font-bold text-sm"
                          >
                            🗑️ מחק
                          </button>
                        </div>
                        
                        <div className="flex-1">
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            הערות:
                          </label>
                          <textarea
                            value={image.note || ''}
                            onChange={(e) => updateImageNote(image.id, e.target.value)}
                            placeholder="הוסף הערות על התמונה... (למשל: 'סדק בקיר צפוני, דרוש תיקון מיידי')"
                            className="w-full p-3 border-2 border-gray-300 rounded-lg resize-none focus:border-black focus:outline-none"
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* כותרת ראשית */}
        <div className="bg-black text-white p-8 rounded-lg shadow-lg mb-6">
          <h1 className="text-4xl font-bold text-center mb-2">
            איטר הנדסה והניהול פרויקטים
          </h1>
          <p className="text-center text-gray-300">
            מערכת לתיעוד וניהול פרויקטי בנייה
          </p>
        </div>

        {/* כפתור פרויקט חדש */}
        <button
          onClick={openModal}
          className="w-full bg-black text-white p-5 rounded-lg shadow-lg hover:bg-gray-800 transition-all duration-200 mb-8 text-xl font-bold"
        >
          ➕ פרויקט חדש
        </button>

        {/* Modal ליצירת פרויקט */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">פרויקט חדש</h2>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createProject()}
                placeholder="הכנס שם לפרויקט..."
                className="w-full p-3 border-2 border-gray-300 rounded-lg mb-4 text-lg"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={createProject}
                  disabled={!projectName.trim()}
                  className="flex-1 bg-black text-white p-3 rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
                >
                  ✓ צור
                </button>
                <button
                  onClick={closeModal}
                  className="flex-1 bg-gray-200 text-gray-800 p-3 rounded-lg hover:bg-gray-300 font-bold"
                >
                  ✗ ביטול
                </button>
              </div>
            </div>
          </div>
        )}

        {/* רשימת פרויקטים */}
        <div className="space-y-4">
          {projects.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
              <p className="text-lg">אין פרויקטים עדיין</p>
              <p className="text-sm mt-2">לחץ על "פרויקט חדש" כדי להתחיל</p>
            </div>
          ) : (
            projects.map(project => (
              <div
                key={project.id}
                className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      {project.name}
                    </h3>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>📷 {project.images.length} תמונות</span>
                      <span>📅 {new Date(project.createdAt).toLocaleDateString('he-IL')}</span>
                    </div>
                  </div>
                  
                  {/* כפתורי פעולה */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openProject(project)}
                      className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 font-bold"
                    >
                      פתח
                    </button>
                    <button
                      onClick={() => askDelete(project)}
                      className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 font-bold"
                      title="מחק פרויקט"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal למחיקת פרויקט */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full">
              <div className="text-center mb-4">
                <div className="text-5xl mb-3">⚠️</div>
                <h2 className="text-2xl font-bold mb-2">מחיקת פרויקט</h2>
                <p className="text-gray-600">
                  האם אתה בטוח שברצונך למחוק את הפרויקט
                </p>
                <p className="text-xl font-bold mt-2">"{deleteConfirm.name}"?</p>
                <p className="text-sm text-red-600 mt-2">
                  פעולה זו לא ניתנת לביטול!
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => deleteProject(deleteConfirm.id)}
                  className="flex-1 bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 font-bold"
                >
                  🗑️ מחק
                </button>
                <button
                  onClick={cancelDelete}
                  className="flex-1 bg-gray-200 text-gray-800 p-3 rounded-lg hover:bg-gray-300 font-bold"
                >
                  ✗ ביטול
                </button>
              </div>
            </div>
          </div>
        )}

        {/* הוראות שימוש */}
        {projects.length === 0 && (
          <div className="mt-8 bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
            <h3 className="font-bold text-blue-900 mb-3">✅ בדיקות למשימה 1.1:</h3>
            <ul className="space-y-2 text-blue-800">
              <li>✓ לחץ על "פרויקט חדש" והכנס שם</li>
              <li>✓ הפרויקט צריך להופיע ברשימה</li>
              <li>✓ רענן את הדף - הפרויקט צריך להישאר שמור</li>
              <li>✓ צור עוד פרויקטים - כולם צריכים להופיע</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItarApp;