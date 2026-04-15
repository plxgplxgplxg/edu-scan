from pathlib import Path

from app.domain.layouts.template_registry import TemplateRegistry


def test_template_registry_resolves_alias():
    registry = TemplateRegistry()

    template = registry.get("60q_4col")

    assert template is not None
    assert template.name == "institute_60_4col"
    assert template.question_count == 60
    assert len(template.id_fields) == 2
    assert len(template.answer_groups) == 4


def test_template_registry_loads_custom_json_templates(tmp_path):
    template_file = tmp_path / "custom_layout.json"
    template_file.write_text(
        """
        {
          "name": "custom_layout",
          "aliases": ["custom"],
          "question_count": 25,
          "answer_options": ["A", "B", "C", "D"],
          "id_fields": [
            {
              "name": "roll_no",
              "code_length": 5,
              "region": {"x": 0.1, "y": 0.1, "width": 0.2, "height": 0.2},
              "grid": {"rows": 10, "columns": 5},
              "primary": true
            }
          ],
          "student_id_length": 5,
          "student_id_region": {"x": 0.1, "y": 0.1, "width": 0.2, "height": 0.2},
          "student_id_grid": {"rows": 10, "columns": 5},
          "answer_groups": [
            {
              "region": {"x": 0.2, "y": 0.3, "width": 0.6, "height": 0.5},
              "question_start": 1,
              "question_end": 25
            }
          ],
          "answer_region": {"x": 0.2, "y": 0.3, "width": 0.6, "height": 0.5},
          "answer_columns": 1
        }
        """,
        encoding="utf-8",
    )

    registry = TemplateRegistry(templates=[])
    loaded = registry.load_directory(Path(tmp_path))

    assert loaded == 1
    assert registry.get("custom") is not None
    assert registry.get("custom").question_count == 25
