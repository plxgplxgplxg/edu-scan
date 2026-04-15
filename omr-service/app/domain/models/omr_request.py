from pydantic import BaseModel, Field, HttpUrl


class OmrProcessRequest(BaseModel):
    imageUrl: HttpUrl
    questionCount: int = Field(gt=0, le=200)
