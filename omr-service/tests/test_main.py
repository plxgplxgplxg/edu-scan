from app.main import app


def test_rest_omr_routes_are_not_registered():
    route_paths = {route.path for route in app.routes}

    assert "/health" in route_paths
    assert "/detect" not in route_paths
    assert "/grade-overlay" not in route_paths
    assert "/process" not in route_paths
