document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('printForm').addEventListener('submit', function(event) {
      event.preventDefault();
  
      const form = document.getElementById('printForm');
      const formData = new FormData(form);
  
      fetch('/processar', {
        method: 'POST',
        body: formData
      })
        .then(response => {
          if (response.ok) {
            // Fazer o download do PDF gerado
            response.blob().then(blob => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'impressao.pdf';
              a.click();
              URL.revokeObjectURL(url);
            });
          } else {
            console.error('Erro ao processar o formulário');
          }
        })
        .catch(error => {
          console.log("sou gay")
          console.error(error);
        }); 
  
      form.reset();
    });
  });  