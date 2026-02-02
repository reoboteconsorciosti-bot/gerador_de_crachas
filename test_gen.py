from src.badge_engine import generate_badge
import os

def test_generation():
    template_path = "assets/templates/template.png"
    font_path = "assets/fonts/OpenSans-Bold.ttf"
    output_path = "test_output.pdf"

    print(f"Testando geração com template: {template_path}")
    
    if not os.path.exists(template_path):
        print("Erro: Template não encontrado!")
        return

    try:
        # Generate for a long name to test fitting
        name = "Pedro de Alcântara João Carlos Leopoldo Salvador Bibiano Francisco Xavier de Paula Leocádio Miguel Gabriel Rafael Gonzaga"
        print(f"Gerando crachá para: {name[:20]}...")
        
        img = generate_badge(name, template_path, font_path)
        
        img.save(output_path, "PDF", resolution=300.0)
        print(f"Sucesso! PDF salvo em {output_path}")
        
    except Exception as e:
        print(f"Falha: {e}")

if __name__ == "__main__":
    test_generation()
