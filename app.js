document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const previewImage = document.getElementById('previewImage');
    const form = document.getElementById('campaignForm');
    const publishBtn = document.getElementById('publishBtn');
    const btnText = publishBtn.querySelector('span');
    const btnLoader = document.getElementById('btnLoader');
    const toast = document.getElementById('toast');
    
    let uploadedFile = null;

    // --- Drag and Drop Logic --- //
    
    // Open file selector on click
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFile(fileInput.files[0]);
        }
    });

    function handleFile(file) {
        if (file.type.startsWith('image/')) {
            uploadedFile = file;
            const reader = new FileReader();
            
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                previewImage.classList.remove('hidden');
                
                // Keep the icon hidden when image is shown
                const contentElements = uploadZone.querySelectorAll('div, p');
                contentElements.forEach(el => {
                    if (el !== previewImage) el.style.opacity = '0';
                });
            }
            
            reader.readAsDataURL(file);
        } else {
            alert('Por favor, sube un archivo de imagen válido (JPG, PNG).');
        }
    }


    // --- Form Submission Logic --- //
    
 form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!uploadedFile) {
        uploadZone.style.borderColor = 'var(--danger)';
        uploadZone.classList.add('shake');
        setTimeout(() => {
            uploadZone.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            uploadZone.classList.remove('shake');
        }, 500);
        return;
    }

    const applyTo = document.getElementById('applyTo').value;
    const targetGroup = document.getElementById('targetGroup').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    const formData = new FormData();
    formData.append('image', uploadedFile);
    formData.append('applyTo', applyTo);
    formData.append('targetGroup', targetGroup);
    formData.append('startDate', startDate);
    formData.append('endDate', endDate);

    try {
        toggleLoading(true);

        const response = await fetch('/api/campaigns', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'No se pudo guardar la campaña.');
        }

        console.log('Campaña creada:', result);
        showToast();
        resetForm();
    } catch (error) {
        console.error(error);
        alert(error.message);
    } finally {
        toggleLoading(false);
    }
});

    function toggleLoading(isLoading) {
        if (isLoading) {
            btnText.textContent = "Sincronizando con Intune...";
            btnLoader.classList.remove('hidden');
            publishBtn.disabled = true;
            publishBtn.style.opacity = "0.8";
        } else {
            btnText.textContent = "Publicar a Intune";
            btnLoader.classList.add('hidden');
            publishBtn.disabled = false;
            publishBtn.style.opacity = "1";
        }
    }

    function showToast() {
        toast.classList.remove('hidden');
        // Small delay for transition trigger
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Hide after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 400); // Wait for transition
        }, 4000);
    }
    
    function resetForm() {
        form.reset();
        uploadedFile = null;
        fileInput.value = '';
        previewImage.classList.add('hidden');
        previewImage.src = '';
        const contentElements = uploadZone.querySelectorAll('div, p');
        contentElements.forEach(el => el.style.opacity = '1');
    }
});
