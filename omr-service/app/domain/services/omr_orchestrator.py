from app.core.exceptions import InvalidImageError
from app.domain.layouts.layout_classifier import LayoutClassifier
from app.domain.layouts.template_registry import TemplateRegistry
from app.domain.models.omr_request import OmrProcessRequest
from app.domain.models.omr_response import OmrProcessResponse
from app.domain.services.answer_detector import AnswerDetector
from app.domain.services.image_processor import ImageProcessor
from app.domain.services.student_id_detector import StudentIdDetector
from app.infrastructure.image.image_loader import ImageLoader
from app.infrastructure.image.image_validator import ImageValidator


class OmrOrchestrator:
    def __init__(self) -> None:
        self.image_loader = ImageLoader()
        self.image_validator = ImageValidator()
        self.image_processor = ImageProcessor()
        self.template_registry = TemplateRegistry()
        self.layout_classifier = LayoutClassifier(self.template_registry)
        self.student_id_detector = StudentIdDetector()
        self.answer_detector = AnswerDetector()

    def process(self, request: OmrProcessRequest) -> OmrProcessResponse:
        image = self.image_loader.load_from_url(str(request.imageUrl))
        self.image_validator.validate(image)

        processed_image = self.image_processor.preprocess(image)
        if processed_image.size == 0:
            raise InvalidImageError("Image preprocessing failed")

        template = self.layout_classifier.classify(processed_image, request.questionCount)
        student_code = self.student_id_detector.detect(processed_image, template)
        answers = self.answer_detector.detect(
            processed_image,
            request.questionCount,
            template,
        )
        needs_review = student_code is None or any(
            answer.needsReview for answer in answers
        )

        return OmrProcessResponse(
            studentCode=student_code,
            needsReview=needs_review,
            answers=answers,
        )
